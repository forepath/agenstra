import { ConsoleLivePushBridgeService } from './console-live-push-bridge.service';

describe('ConsoleLivePushBridgeService', () => {
  const clientsRepository = { findById: jest.fn() };
  const clientUsersRepository = { findByClientId: jest.fn() };
  const webPush = { isEnabled: jest.fn(), sendToUserIds: jest.fn() };
  let service: ConsoleLivePushBridgeService;
  const state = {
    clientId: 'c1',
    agentId: 'a1',
    git: { indicator: null },
    chat: { phase: 'idle' as const },
  };

  beforeEach(() => {
    service = new ConsoleLivePushBridgeService(
      clientsRepository as never,
      clientUsersRepository as never,
      webPush as never,
    );
    jest.clearAllMocks();
    webPush.isEnabled.mockReturnValue(true);
    clientsRepository.findById.mockResolvedValue({ userId: 'owner-1' });
    clientUsersRepository.findByClientId.mockResolvedValue([{ userId: 'member-1' }]);
    webPush.sendToUserIds.mockResolvedValue(undefined);
    delete process.env.AGENT_CONSOLE_FRONTEND_URL;
  });

  it('notifyChatMessage is a no-op when push is disabled', async () => {
    webPush.isEnabled.mockReturnValue(false);

    await service.notifyChatMessage(state, 'agent', undefined);

    expect(webPush.sendToUserIds).not.toHaveBeenCalled();
  });

  it('notifyChatMessage sends to workspace members except origin user', async () => {
    await service.notifyChatMessage(state, 'user', 'member-1');

    expect(webPush.sendToUserIds).toHaveBeenCalledWith(
      ['owner-1'],
      expect.objectContaining({
        title: 'New message in workspace',
        url: '/clients/c1/agents/a1',
        tag: 'chat:c1:a1',
      }),
    );
  });

  it('notifyAutomationRun skips running status', async () => {
    await service.notifyAutomationRun(state, { runId: 'r1', status: 'running' });

    expect(webPush.sendToUserIds).not.toHaveBeenCalled();
  });

  it('notifyAutomationRun sends completed notification', async () => {
    await service.notifyAutomationRun(state, { runId: 'r1', status: 'succeeded' });

    expect(webPush.sendToUserIds).toHaveBeenCalledWith(
      ['owner-1', 'member-1'],
      expect.objectContaining({
        title: 'Ticket automation',
        body: expect.stringContaining('completed'),
        tag: 'automation:r1',
      }),
    );
  });

  it('notifyAutomationRun deduplicates repeated status within window', async () => {
    await service.notifyAutomationRun(state, { runId: 'r1', status: 'failed' });
    await service.notifyAutomationRun(state, { runId: 'r1', status: 'failed' });

    expect(webPush.sendToUserIds).toHaveBeenCalledTimes(1);
  });

  it('uses frontend base URL when configured', async () => {
    process.env.AGENT_CONSOLE_FRONTEND_URL = 'https://console.example/';

    await service.notifyChatMessage(state, 'agent', undefined);

    expect(webPush.sendToUserIds).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ url: 'https://console.example/clients/c1/agents/a1' }),
    );
  });
});
