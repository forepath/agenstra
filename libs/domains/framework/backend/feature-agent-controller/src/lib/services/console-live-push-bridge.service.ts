import { ClientUsersRepository } from '@forepath/identity/backend';
import { Injectable } from '@nestjs/common';

import type { EnvironmentLiveStateDto } from '../dto/environment-live-state.dto';
import { ClientsRepository } from '../repositories/clients.repository';

import { WebPushNotificationService } from './web-push-notification.service';

@Injectable()
export class ConsoleLivePushBridgeService {
  private readonly recentAutomationPush = new Map<string, number>();
  private static readonly AUTOMATION_DEDUPE_MS = 60_000;

  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly clientUsersRepository: ClientUsersRepository,
    private readonly webPush: WebPushNotificationService,
  ) {}

  async notifyChatMessage(
    state: EnvironmentLiveStateDto,
    from: 'user' | 'agent',
    originUserId: string | undefined,
  ): Promise<void> {
    if (!this.webPush.isEnabled()) {
      return;
    }

    const recipientIds = await this.resolveRecipientUserIds(state.clientId, originUserId);

    if (recipientIds.length === 0) {
      return;
    }

    const title = from === 'agent' ? 'New agent message' : 'New message in workspace';
    const body =
      from === 'agent'
        ? 'An agent replied in an environment you can access.'
        : 'Someone sent a message in an environment you can access.';

    await this.webPush.sendToUserIds(recipientIds, {
      title,
      body,
      url: this.buildConsoleUrl(state.clientId, state.agentId),
      tag: `chat:${state.clientId}:${state.agentId}`,
    });
  }

  async notifyAutomationRun(
    state: EnvironmentLiveStateDto,
    run: { runId: string; status: 'running' | 'succeeded' | 'failed' | 'cancelled' },
  ): Promise<void> {
    if (!this.webPush.isEnabled() || run.status === 'running') {
      return;
    }

    const dedupeKey = `${run.runId}:${run.status}`;
    const now = Date.now();
    const last = this.recentAutomationPush.get(dedupeKey);

    if (last && now - last < ConsoleLivePushBridgeService.AUTOMATION_DEDUPE_MS) {
      return;
    }

    this.recentAutomationPush.set(dedupeKey, now);

    const recipientIds = await this.resolveRecipientUserIds(state.clientId);

    if (recipientIds.length === 0) {
      return;
    }

    const statusLabel = run.status === 'succeeded' ? 'completed' : run.status === 'failed' ? 'failed' : 'was cancelled';

    await this.webPush.sendToUserIds(recipientIds, {
      title: 'Ticket automation',
      body: `An automation run ${statusLabel} in your workspace.`,
      url: this.buildConsoleUrl(state.clientId, state.agentId),
      tag: `automation:${run.runId}`,
    });
  }

  private buildConsoleUrl(clientId: string, agentId: string): string {
    const path = `/clients/${clientId}/agents/${agentId}`;
    const base = process.env.AGENT_CONSOLE_FRONTEND_URL?.replace(/\/$/, '') || '';

    return base ? `${base}${path}` : path;
  }

  private async resolveRecipientUserIds(clientId: string, excludeUserId?: string): Promise<string[]> {
    const client = await this.clientsRepository.findById(clientId);

    if (!client) {
      return [];
    }

    const userIds = new Set<string>();

    if (client.userId) {
      userIds.add(client.userId);
    }

    const members = await this.clientUsersRepository.findByClientId(clientId);

    for (const member of members) {
      if (member.userId) {
        userIds.add(member.userId);
      }
    }

    if (excludeUserId) {
      userIds.delete(excludeUserId);
    }

    return [...userIds];
  }
}
