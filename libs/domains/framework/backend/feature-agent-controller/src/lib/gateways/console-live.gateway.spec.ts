jest.mock('@forepath/identity/backend', () => {
  const actual = jest.requireActual('@forepath/identity/backend');

  return { ...actual, ensureClientAccess: jest.fn().mockResolvedValue(undefined) };
});

import * as identityBackend from '@forepath/identity/backend';
import { ClientUsersRepository, SocketAuthService } from '@forepath/identity/backend';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type { EnvironmentLiveStateDto } from '../dto/environment-live-state.dto';
import { ClientsRepository } from '../repositories/clients.repository';
import { ConsoleLiveObserverService } from '../services/console-live-observer.service';
import { ConsoleLiveRealtimeService } from '../services/console-live-realtime.service';
import { TicketBoardRealtimeService } from '../services/ticket-board-realtime.service';
import { createConsoleLiveObserverServiceMock } from '../testing/console-live-observer.service.mock';

import { ConsoleLiveGateway } from './console-live.gateway';

describe('ConsoleLiveGateway', () => {
  let gateway: ConsoleLiveGateway;
  let consoleLiveObserver: ReturnType<typeof createConsoleLiveObserverServiceMock>;
  const mockClientsRepository = {
    findById: jest.fn(),
  };
  const mockClientUsersRepository = {
    findUserClientAccess: jest.fn(),
  };
  const mockSocketAuthService = {
    validateAndGetUser: jest
      .fn()
      .mockResolvedValue({ isApiKeyAuth: true, user: { id: 'api-key-user', roles: ['admin'] } }),
  };
  const createMockSocket = (id = 'socket-1', withUserInfo = true) => {
    const emitted: { event: string; payload: unknown }[] = [];
    const socket = {
      id,
      emit: jest.fn((event: string, payload: unknown) => emitted.push({ event, payload })),
      getEmitted: () => emitted,
      data: withUserInfo ? { userInfo: { isApiKeyAuth: true, user: { id: 'api-key-user', roles: ['admin'] } } } : {},
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    };

    return socket as any;
  };

  beforeEach(async () => {
    (identityBackend.ensureClientAccess as jest.Mock).mockResolvedValue(undefined);
    consoleLiveObserver = createConsoleLiveObserverServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsoleLiveGateway,
        ConsoleLiveRealtimeService,
        { provide: ClientsRepository, useValue: mockClientsRepository },
        { provide: ClientUsersRepository, useValue: mockClientUsersRepository },
        { provide: SocketAuthService, useValue: mockSocketAuthService },
        { provide: ConsoleLiveObserverService, useValue: consoleLiveObserver },
      ],
    }).compile();

    gateway = module.get(ConsoleLiveGateway);
    gateway.afterInit({ use: jest.fn() } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeInstanceOf(ConsoleLiveGateway);
  });

  it('should emit error when clientId is missing', async () => {
    const socket = createMockSocket();

    await gateway.handleSetClient({}, socket);
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: 'clientId is required' }));
  });

  it('should emit Unauthorized when socket has no userInfo', async () => {
    const socket = createMockSocket('socket-1', false);

    await gateway.handleSetClient({ clientId: 'c1' }, socket);
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: 'Unauthorized' }));
  });

  it('should join room, start observing, and emit setClientSuccess with snapshot', async () => {
    const snapshot: EnvironmentLiveStateDto[] = [
      { clientId: 'client-uuid', agentId: 'agent-1', git: { indicator: null }, chat: { phase: 'idle' } },
    ];

    jest.mocked(consoleLiveObserver.getSnapshotForClient).mockReturnValue(snapshot);
    const socket = createMockSocket();

    await gateway.handleSetClient({ clientId: 'client-uuid' }, socket);

    expect(socket.join).toHaveBeenCalledWith(TicketBoardRealtimeService.clientRoom('client-uuid'));
    expect(consoleLiveObserver.ensureObserving).toHaveBeenCalledWith('client-uuid');
    expect(socket.emit).toHaveBeenCalledWith(
      'setClientSuccess',
      expect.objectContaining({ clientId: 'client-uuid', snapshot }),
    );
  });

  it('should leave previous room and release observer when switching client', async () => {
    const socket = createMockSocket();

    await gateway.handleSetClient({ clientId: 'client-a' }, socket);
    await gateway.handleSetClient({ clientId: 'client-b' }, socket);

    expect(socket.leave).toHaveBeenCalledWith(TicketBoardRealtimeService.clientRoom('client-a'));
    expect(consoleLiveObserver.releaseObserving).toHaveBeenCalledWith('client-a');
    expect(socket.join).toHaveBeenCalledWith(TicketBoardRealtimeService.clientRoom('client-b'));
    expect(consoleLiveObserver.ensureObserving).toHaveBeenCalledWith('client-b');
  });

  it('should emit forbidden message when ensureClientAccess throws ForbiddenException', async () => {
    (identityBackend.ensureClientAccess as jest.Mock).mockRejectedValueOnce(new ForbiddenException());
    const socket = createMockSocket();

    await gateway.handleSetClient({ clientId: 'no-access' }, socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ message: 'You do not have access to this client' }),
    );
    expect(consoleLiveObserver.ensureObserving).not.toHaveBeenCalled();
  });

  it('should emit generic error when ensureClientAccess throws non-forbidden error', async () => {
    (identityBackend.ensureClientAccess as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'));
    const socket = createMockSocket();

    await gateway.handleSetClient({ clientId: 'any' }, socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ message: 'Unable to set client context' }),
    );
  });

  it('should emit setClientSuccess without re-joining when same client is already selected', async () => {
    const snapshot: EnvironmentLiveStateDto[] = [
      { clientId: 'same', agentId: 'agent-1', git: { indicator: null }, chat: { phase: 'idle' } },
    ];

    jest.mocked(consoleLiveObserver.getSnapshotForClient).mockReturnValue(snapshot);
    const socket = createMockSocket();

    await gateway.handleSetClient({ clientId: 'same' }, socket);
    (socket.join as jest.Mock).mockClear();
    jest.mocked(consoleLiveObserver.ensureObserving).mockClear();

    await gateway.handleSetClient({ clientId: 'same' }, socket);

    expect(socket.join).not.toHaveBeenCalled();
    expect(consoleLiveObserver.ensureObserving).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenLastCalledWith(
      'setClientSuccess',
      expect.objectContaining({ clientId: 'same', message: expect.stringContaining('already'), snapshot }),
    );
  });

  it('should leave room and release observer on disconnect', async () => {
    const socket = createMockSocket();

    await gateway.handleSetClient({ clientId: 'to-leave' }, socket);
    (socket.leave as jest.Mock).mockClear();
    jest.mocked(consoleLiveObserver.releaseObserving).mockClear();

    gateway.handleDisconnect(socket as any);

    expect(socket.leave).toHaveBeenCalledWith(TicketBoardRealtimeService.clientRoom('to-leave'));
    expect(consoleLiveObserver.releaseObserving).toHaveBeenCalledWith('to-leave');
  });
});
