import { GitStatusDto } from '@forepath/framework/backend/feature-agent-manager';
import { AuthenticationType, ClientAgentCredentialsRepository } from '@forepath/identity/backend';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import type { EnvironmentLiveStateDto } from '../dto/environment-live-state.dto';
import type { EnvironmentAutomationRunStatus } from '../dto/environment-live-state.dto';
import type { TicketAutomationRunResponseDto } from '../dto/ticket-automation/ticket-automation-run-response.dto';
import { TicketAutomationRunStatus } from '../entities/ticket-automation.enums';
import { ClientsRepository } from '../repositories/clients.repository';
import { getClientEndpointTlsPolicy, validateClientEndpointWithDnsOrThrow } from '../utils/client-endpoint-security';

import { ClientAgentProxyService } from './client-agent-proxy.service';
import { ClientAgentVcsProxyService } from './client-agent-vcs-proxy.service';
import { ClientsService } from './clients.service';
import { ConsoleLiveAgentWatch } from './console-live-agent-watch';
import { ConsoleLivePushBridgeService } from './console-live-push-bridge.service';
import { ConsoleLiveRealtimeService } from './console-live-realtime.service';
import {
  buildGitStateFromStatus,
  chatStateFromMessage,
  chatStateStreaming,
  createInitialEnvironmentLiveState,
  mergeEnvironmentLiveState,
} from './console-live-state.builder';

const OBSERVER_STOP_DEBOUNCE_MS = 30_000;
const VCS_POLL_INTERVAL_MS = parseInt(process.env.CONSOLE_VCS_POLL_INTERVAL_MS || '30000', 10);
const STATE_THROTTLE_MS = parseInt(process.env.CONSOLE_STATE_THROTTLE_MS || '500', 10);

@Injectable()
export class ConsoleLiveObserverService implements OnModuleDestroy {
  private readonly logger = new Logger(ConsoleLiveObserverService.name);
  private readonly refCountByClient = new Map<string, number>();
  private readonly stateByKey = new Map<string, EnvironmentLiveStateDto>();
  private readonly watchesByKey = new Map<string, ConsoleLiveAgentWatch>();
  private readonly stopTimersByClient = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly vcsTimersByClient = new Map<string, ReturnType<typeof setInterval>>();
  private readonly lastEmitAtByKey = new Map<string, number>();
  private readonly pendingOriginUserIdByKey = new Map<string, string>();

  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly clientsService: ClientsService,
    private readonly clientAgentCredentialsRepository: ClientAgentCredentialsRepository,
    private readonly clientAgentProxy: ClientAgentProxyService,
    private readonly clientAgentVcsProxy: ClientAgentVcsProxyService,
    private readonly consoleLiveRealtime: ConsoleLiveRealtimeService,
    private readonly consoleLivePushBridge: ConsoleLivePushBridgeService,
  ) {}

  onModuleDestroy(): void {
    for (const timer of this.stopTimersByClient.values()) {
      clearTimeout(timer);
    }

    for (const timer of this.vcsTimersByClient.values()) {
      clearInterval(timer);
    }

    void this.stopAll();
  }

  ensureObserving(clientId: string): void {
    const prev = this.refCountByClient.get(clientId) ?? 0;

    this.refCountByClient.set(clientId, prev + 1);

    const pendingStop = this.stopTimersByClient.get(clientId);

    if (pendingStop) {
      clearTimeout(pendingStop);
      this.stopTimersByClient.delete(clientId);
    }

    if (prev === 0) {
      void this.startObservingClient(clientId).catch((err) => {
        this.logger.warn(`Failed to start console live observer for ${clientId}: ${err}`);
      });
    }
  }

  releaseObserving(clientId: string): void {
    const prev = this.refCountByClient.get(clientId) ?? 0;

    if (prev <= 1) {
      this.refCountByClient.delete(clientId);
      const timer = setTimeout(() => {
        this.stopTimersByClient.delete(clientId);
        void this.stopObservingClient(clientId);
      }, OBSERVER_STOP_DEBOUNCE_MS);

      this.stopTimersByClient.set(clientId, timer);
    } else {
      this.refCountByClient.set(clientId, prev - 1);
    }
  }

  getSnapshotForClient(clientId: string): EnvironmentLiveStateDto[] {
    return [...this.stateByKey.values()].filter((s) => s.clientId === clientId);
  }

  /** Called when UI forwards a user chat (to attribute origin for push). */
  notePendingUserChatOrigin(clientId: string, agentId: string, userId: string | undefined): void {
    if (!userId) {
      return;
    }

    this.pendingOriginUserIdByKey.set(this.stateKey(clientId, agentId), userId);
  }

  invalidateVcs(clientId: string, agentId: string): void {
    void this.refreshGitState(clientId, agentId).catch((err) => {
      this.logger.debug(`VCS refresh failed for ${clientId}/${agentId}: ${err}`);
    });
  }

  notifyAutomationRunFromDto(dto: TicketAutomationRunResponseDto): void {
    const mapped = this.mapAutomationRunStatus(dto.status);

    if (!mapped) {
      return;
    }

    this.notifyAutomationRun(dto.clientId, dto.agentId, {
      runId: dto.id,
      status: mapped,
      finishedAt: dto.finishedAt?.toISOString(),
    });
  }

  private mapAutomationRunStatus(status: TicketAutomationRunStatus): EnvironmentAutomationRunStatus | null {
    switch (status) {
      case TicketAutomationRunStatus.SUCCEEDED:
        return 'succeeded';
      case TicketAutomationRunStatus.CANCELLED:
        return 'cancelled';
      case TicketAutomationRunStatus.FAILED:
      case TicketAutomationRunStatus.TIMED_OUT:
      case TicketAutomationRunStatus.ESCALATED:
        return 'failed';
      default:
        return null;
    }
  }

  notifyAutomationRun(
    clientId: string,
    agentId: string,
    run: { runId: string; status: EnvironmentAutomationRunStatus; finishedAt?: string },
  ): void {
    const key = this.stateKey(clientId, agentId);
    const current = this.stateByKey.get(key) ?? createInitialEnvironmentLiveState(clientId, agentId);
    const next = mergeEnvironmentLiveState(current, {
      automation: {
        lastRunStatus: run.status,
        lastRunAt: run.finishedAt ?? new Date().toISOString(),
        runId: run.runId,
      },
    });

    this.publishState(next);
    void this.consoleLivePushBridge.notifyAutomationRun(next, run).catch(() => undefined);
  }

  private stateKey(clientId: string, agentId: string): string {
    return `${clientId}:${agentId}`;
  }

  private async startObservingClient(clientId: string): Promise<void> {
    const agents = await this.clientAgentProxy.getClientAgents(clientId, 200, 0);

    for (const agent of agents) {
      await this.startAgentWatch(clientId, agent.id);
    }

    const poll = (): void => {
      void this.pollAllVcs(clientId).catch((err) => {
        this.logger.debug(`VCS poll error for ${clientId}: ${err}`);
      });
    };

    poll();
    const interval = setInterval(poll, VCS_POLL_INTERVAL_MS);

    this.vcsTimersByClient.set(clientId, interval);
  }

  private async stopObservingClient(clientId: string): Promise<void> {
    const vcsTimer = this.vcsTimersByClient.get(clientId);

    if (vcsTimer) {
      clearInterval(vcsTimer);
      this.vcsTimersByClient.delete(clientId);
    }

    const keys = [...this.watchesByKey.keys()].filter((k) => k.startsWith(`${clientId}:`));

    for (const key of keys) {
      const watch = this.watchesByKey.get(key);

      this.watchesByKey.delete(key);
      this.stateByKey.delete(key);
      this.lastEmitAtByKey.delete(key);
      this.pendingOriginUserIdByKey.delete(key);

      if (watch) {
        await watch.stop();
      }
    }
  }

  private async stopAll(): Promise<void> {
    for (const clientId of [...this.refCountByClient.keys()]) {
      await this.stopObservingClient(clientId);
    }

    this.refCountByClient.clear();
  }

  private async startAgentWatch(clientId: string, agentId: string): Promise<void> {
    const key = this.stateKey(clientId, agentId);

    if (this.watchesByKey.has(key)) {
      return;
    }

    const creds = await this.clientAgentCredentialsRepository.findByClientAndAgent(clientId, agentId);

    if (!creds?.password) {
      this.logger.debug(`Skip console live watch: no credentials for ${clientId}/${agentId}`);

      return;
    }

    const client = await this.clientsRepository.findByIdOrThrow(clientId);

    await validateClientEndpointWithDnsOrThrow(client.endpoint);
    const tlsPolicy = getClientEndpointTlsPolicy(this.logger);
    const remoteUrl = this.buildAgentsWsUrl(client.endpoint, client.agentWsPort);
    const authHeader = await this.getAuthHeader(clientId);
    const watch = new ConsoleLiveAgentWatch(
      clientId,
      agentId,
      remoteUrl,
      authHeader,
      creds.password,
      tlsPolicy.rejectUnauthorized,
      {
        onChatMessage: (payload) => this.handleChatMessage(clientId, agentId, payload),
        onChatEvent: () => this.handleChatEvent(clientId, agentId),
        onFileUpdateNotification: () => this.invalidateVcs(clientId, agentId),
        onDisconnected: () => {
          this.logger.debug(`Console live watch disconnected for ${clientId}/${agentId}`);
        },
      },
    );

    try {
      await watch.start();
      this.watchesByKey.set(key, watch);

      if (!this.stateByKey.has(key)) {
        this.stateByKey.set(key, createInitialEnvironmentLiveState(clientId, agentId));
      }

      await this.refreshGitState(clientId, agentId);
    } catch (err) {
      this.logger.warn(`Console live watch failed for ${clientId}/${agentId}: ${err}`);
      await watch.stop();
    }
  }

  private handleChatMessage(clientId: string, agentId: string, payload: unknown): void {
    const envelope = payload as { success?: boolean; data?: { from?: string; timestamp?: string; text?: string } };

    if (!envelope?.success || !envelope.data?.from) {
      return;
    }

    const from = envelope.data.from === 'agent' ? 'agent' : 'user';
    const timestamp = envelope.data.timestamp ?? new Date().toISOString();
    const key = this.stateKey(clientId, agentId);
    const originUserId = from === 'user' ? this.pendingOriginUserIdByKey.get(key) : undefined;

    if (from === 'user' && originUserId) {
      setTimeout(() => this.pendingOriginUserIdByKey.delete(key), 5000);
    }

    const current = this.stateByKey.get(key) ?? createInitialEnvironmentLiveState(clientId, agentId);
    const next = mergeEnvironmentLiveState(current, {
      chat: chatStateFromMessage(from, timestamp, originUserId),
    });

    this.publishState(next);

    if (from === 'agent' || (from === 'user' && originUserId)) {
      void this.consoleLivePushBridge.notifyChatMessage(next, from, originUserId).catch(() => undefined);
    }
  }

  private handleChatEvent(clientId: string, agentId: string): void {
    const key = this.stateKey(clientId, agentId);
    const current = this.stateByKey.get(key) ?? createInitialEnvironmentLiveState(clientId, agentId);

    if (current.chat.phase === 'idle') {
      const next = mergeEnvironmentLiveState(current, {
        chat: chatStateStreaming(current.chat.lastMessageAt),
      });

      this.publishState(next);
    }
  }

  private async refreshGitState(clientId: string, agentId: string): Promise<void> {
    let status: GitStatusDto;

    try {
      status = await this.clientAgentVcsProxy.getStatus(clientId, agentId);
    } catch {
      return;
    }

    const key = this.stateKey(clientId, agentId);
    const current = this.stateByKey.get(key) ?? createInitialEnvironmentLiveState(clientId, agentId);
    const next = mergeEnvironmentLiveState(current, {
      git: buildGitStateFromStatus(status),
    });

    this.publishState(next);
  }

  private async pollAllVcs(clientId: string): Promise<void> {
    const keys = [...this.watchesByKey.keys()].filter((k) => k.startsWith(`${clientId}:`));

    for (const key of keys) {
      const agentId = key.split(':').slice(1).join(':');

      await this.refreshGitState(clientId, agentId);
    }
  }

  private publishState(state: EnvironmentLiveStateDto): void {
    const key = this.stateKey(state.clientId, state.agentId);
    const now = Date.now();
    const last = this.lastEmitAtByKey.get(key) ?? 0;

    if (now - last < STATE_THROTTLE_MS) {
      this.stateByKey.set(key, state);

      return;
    }

    this.lastEmitAtByKey.set(key, now);
    this.stateByKey.set(key, state);
    this.consoleLiveRealtime.emitEnvironmentStateUpsert(state.clientId, state);
  }

  private buildAgentsWsUrl(endpoint: string, overridePort?: number): string {
    const url = new URL(endpoint);
    const effectivePort = (overridePort && String(overridePort)) || process.env.CLIENTS_REMOTE_WS_PORT || '8080';
    const protocol = url.protocol === 'https:' ? 'https' : 'http';

    return `${protocol}://${url.hostname}:${effectivePort}/agents`;
  }

  private async getAuthHeader(clientId: string): Promise<string> {
    const client = await this.clientsRepository.findByIdOrThrow(clientId);

    if (client.authenticationType === AuthenticationType.API_KEY) {
      if (!client.apiKey) {
        throw new Error('API key not configured');
      }

      return `Bearer ${client.apiKey}`;
    }

    const token = await this.clientsService.getAccessToken(clientId);

    return `Bearer ${token}`;
  }
}
