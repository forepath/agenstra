import { ClientAgentCredentialsRepository } from '@forepath/identity/backend';
import { Test, TestingModule } from '@nestjs/testing';

import { TicketAutomationRunStatus } from '../entities/ticket-automation.enums';
import { ClientsRepository } from '../repositories/clients.repository';

import { ClientAgentProxyService } from './client-agent-proxy.service';
import { ClientAgentVcsProxyService } from './client-agent-vcs-proxy.service';
import { ClientsService } from './clients.service';
import { ConsoleLiveObserverService } from './console-live-observer.service';
import { ConsoleLivePushBridgeService } from './console-live-push-bridge.service';
import { ConsoleLiveRealtimeService } from './console-live-realtime.service';
describe('ConsoleLiveObserverService', () => {
  type ObserverInternals = {
    handleChatMessage: (clientId: string, agentId: string, payload: unknown) => void;
    handleChatEvent: (clientId: string, agentId: string) => void;
  };
  let service: ConsoleLiveObserverService;
  const consoleLiveRealtime = { emitEnvironmentStateUpsert: jest.fn() };
  const consoleLivePushBridge = {
    notifyAutomationRun: jest.fn().mockResolvedValue(undefined),
    notifyChatMessage: jest.fn().mockResolvedValue(undefined),
  };
  const clientsRepository = { findByIdOrThrow: jest.fn() };
  const clientsService = { getAccessToken: jest.fn() };
  const clientAgentCredentialsRepository = { findByClientAndAgent: jest.fn() };
  const clientAgentProxy = { getClientAgents: jest.fn().mockResolvedValue([]) };
  const clientAgentVcsProxy = {
    getStatus: jest.fn().mockResolvedValue({
      currentBranch: 'main',
      isClean: true,
      hasUnpushedCommits: false,
      aheadCount: 0,
      behindCount: 0,
      files: [],
    }),
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsoleLiveObserverService,
        { provide: ConsoleLiveRealtimeService, useValue: consoleLiveRealtime },
        { provide: ConsoleLivePushBridgeService, useValue: consoleLivePushBridge },
        { provide: ClientsRepository, useValue: clientsRepository },
        { provide: ClientsService, useValue: clientsService },
        { provide: ClientAgentCredentialsRepository, useValue: clientAgentCredentialsRepository },
        { provide: ClientAgentProxyService, useValue: clientAgentProxy },
        { provide: ClientAgentVcsProxyService, useValue: clientAgentVcsProxy },
      ],
    }).compile();

    service = module.get(ConsoleLiveObserverService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    void service.onModuleDestroy();
  });

  it('returns snapshot entries for a client', () => {
    service.notifyAutomationRun('c1', 'a1', { runId: 'r1', status: 'succeeded' });

    const snapshot = service.getSnapshotForClient('c1');

    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]?.automation?.lastRunStatus).toBe('succeeded');
    expect(service.getSnapshotForClient('other')).toEqual([]);
  });

  it('notePendingUserChatOrigin stores user id when provided', () => {
    service.notePendingUserChatOrigin('c1', 'a1', undefined);
    service.notePendingUserChatOrigin('c1', 'a1', 'user-1');

    expect(service.getSnapshotForClient('c1')).toEqual([]);
  });

  it('notifyAutomationRunFromDto maps failed and cancelled statuses', () => {
    service.notifyAutomationRunFromDto({
      id: 'r2',
      clientId: 'c1',
      agentId: 'a1',
      status: TicketAutomationRunStatus.FAILED,
    } as never);
    jest.advanceTimersByTime(600);
    service.notifyAutomationRunFromDto({
      id: 'r3',
      clientId: 'c1',
      agentId: 'a1',
      status: TicketAutomationRunStatus.CANCELLED,
    } as never);

    expect(consoleLiveRealtime.emitEnvironmentStateUpsert).toHaveBeenCalledTimes(2);
    expect(consoleLivePushBridge.notifyAutomationRun).toHaveBeenCalledTimes(2);
  });

  it('notifyAutomationRunFromDto ignores unmapped statuses', () => {
    service.notifyAutomationRunFromDto({
      id: 'r1',
      clientId: 'c1',
      agentId: 'a1',
      status: TicketAutomationRunStatus.RUNNING,
    } as never);

    expect(consoleLiveRealtime.emitEnvironmentStateUpsert).not.toHaveBeenCalled();
  });

  it('notifyAutomationRunFromDto publishes automation state and notifies push bridge', () => {
    service.notifyAutomationRunFromDto({
      id: 'r1',
      clientId: 'c1',
      agentId: 'a1',
      status: TicketAutomationRunStatus.SUCCEEDED,
      finishedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);

    expect(consoleLiveRealtime.emitEnvironmentStateUpsert).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        clientId: 'c1',
        agentId: 'a1',
        automation: expect.objectContaining({ lastRunStatus: 'succeeded', runId: 'r1' }),
      }),
    );
    expect(consoleLivePushBridge.notifyAutomationRun).toHaveBeenCalled();
  });

  it('ensureObserving and releaseObserving manage client ref counts', async () => {
    service.ensureObserving('client-1');
    service.ensureObserving('client-1');

    await Promise.resolve();

    expect(clientAgentProxy.getClientAgents).toHaveBeenCalledTimes(1);

    service.releaseObserving('client-1');
    service.releaseObserving('client-1');

    jest.advanceTimersByTime(31_000);
    await Promise.resolve();
  });

  it('forwards agent chat messages and notifies push bridge for agent replies', () => {
    const internals = service as unknown as ObserverInternals;

    internals.handleChatMessage('c1', 'a1', {
      success: true,
      data: { from: 'agent', timestamp: '2026-01-01T00:00:00.000Z', text: 'hello' },
    });

    expect(consoleLiveRealtime.emitEnvironmentStateUpsert).toHaveBeenCalled();
    expect(consoleLivePushBridge.notifyChatMessage).toHaveBeenCalled();
  });

  it('handleChatEvent moves idle chat into streaming phase', () => {
    const internals = service as unknown as ObserverInternals;

    internals.handleChatEvent('c1', 'a1');

    expect(consoleLiveRealtime.emitEnvironmentStateUpsert).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        chat: expect.objectContaining({ phase: 'streaming' }),
      }),
    );
  });

  it('invalidateVcs refreshes git state when VCS status is available', async () => {
    service.notifyAutomationRun('c1', 'a1', { runId: 'r1', status: 'failed' });
    jest.clearAllMocks();
    jest.advanceTimersByTime(600);

    service.invalidateVcs('c1', 'a1');
    await Promise.resolve();

    expect(clientAgentVcsProxy.getStatus).toHaveBeenCalledWith('c1', 'a1');
    expect(consoleLiveRealtime.emitEnvironmentStateUpsert).toHaveBeenCalled();
  });
});
