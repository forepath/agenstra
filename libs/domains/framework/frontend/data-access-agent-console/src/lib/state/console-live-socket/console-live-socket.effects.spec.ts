import { EventEmitter } from 'events';

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { KeycloakService } from 'keycloak-angular';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { setConsoleLiveSocketInstance } from './console-live-socket-instance';
import {
  connectConsoleLiveSocket,
  connectConsoleLiveSocketFailure,
  connectConsoleLiveSocketSuccess,
  disconnectConsoleLiveSocket,
  disconnectConsoleLiveSocketSuccess,
  environmentLiveStateUpsert,
} from './console-live-socket.actions';
import { CONSOLE_LIVE_SOCKET_EVENTS } from './console-live-socket.constants';
import {
  connectConsoleLiveSocket$,
  disconnectConsoleLiveSocket$,
  restoreConsoleLiveSocketClient$,
} from './console-live-socket.effects';
import { initialConsoleLiveSocketState } from './console-live-socket.reducer';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

jest.mock('keycloak-angular', () => ({
  KeycloakService: jest.fn(),
}));

describe('ConsoleLiveSocketEffects', () => {
  let actions$: Subject<ReturnType<typeof connectConsoleLiveSocket>>;
  let mockSocket: EventEmitter & { disconnect: jest.Mock; connected: boolean };
  let mockEnvironment: {
    controller: { websocketUrl: string; consoleWebsocketUrl?: string };
    authentication: { type: string; apiKey?: string };
  };

  beforeEach(() => {
    actions$ = new Subject();
    mockSocket = Object.assign(new EventEmitter(), {
      disconnect: jest.fn(),
      connected: false,
    });
    (io as jest.Mock).mockReturnValue(mockSocket as unknown as Socket);

    mockEnvironment = {
      controller: { websocketUrl: 'http://localhost:8081/clients' },
      authentication: { type: 'api-key', apiKey: 'test-api-key' },
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            consoleLiveSocket: {
              ...initialConsoleLiveSocketState,
              selectedClientId: 'workspace-1',
            },
          },
        }),
        { provide: ENVIRONMENT, useValue: mockEnvironment },
        { provide: KeycloakService, useValue: { getToken: jest.fn() } },
      ],
    });

    TestBed.inject(Actions);
  });

  afterEach(() => {
    setConsoleLiveSocketInstance(null);
    const d = new Subject<ReturnType<typeof disconnectConsoleLiveSocket>>();

    disconnectConsoleLiveSocket$(d as never).subscribe();
    d.next(disconnectConsoleLiveSocket());
    d.complete();
    jest.clearAllMocks();
  });

  describe('connectConsoleLiveSocket$', () => {
    it('returns connectConsoleLiveSocketFailure when URL cannot be resolved', (done) => {
      const env = { ...mockEnvironment, controller: { websocketUrl: '' } };

      connectConsoleLiveSocket$(actions$ as never, env as never, null).subscribe((result) => {
        expect(result).toEqual(connectConsoleLiveSocketFailure({ error: 'Console WebSocket URL not configured' }));
        done();
      });
      actions$.next(connectConsoleLiveSocket());
    });

    it('creates socket connection with API key authentication', (done) => {
      connectConsoleLiveSocket$(actions$ as never, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        expect(io).toHaveBeenCalledWith('http://localhost:8081/console', {
          transports: ['websocket'],
          rejectUnauthorized: false,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          auth: { Authorization: 'Bearer test-api-key' },
        });
        expect(result).toEqual(connectConsoleLiveSocketSuccess());
        done();
      });
      actions$.next(connectConsoleLiveSocket());
      mockSocket.emit('connect');
    });
  });

  describe('disconnectConsoleLiveSocket$', () => {
    it('emits disconnect success', (done) => {
      disconnectConsoleLiveSocket$(actions$ as never).subscribe((result) => {
        expect(result).toEqual(disconnectConsoleLiveSocketSuccess());
        done();
      });
      actions$.next(disconnectConsoleLiveSocket());
    });

    it('disconnects underlying socket when connect had run', (done) => {
      connectConsoleLiveSocket$(actions$ as never, TestBed.inject(ENVIRONMENT), null).subscribe();
      actions$.next(connectConsoleLiveSocket());
      mockSocket.emit('connect');

      disconnectConsoleLiveSocket$(actions$ as never).subscribe(() => {
        expect(mockSocket.disconnect).toHaveBeenCalled();
        done();
      });
      actions$.next(disconnectConsoleLiveSocket());
    });
  });

  describe('environmentStateUpsert event', () => {
    it('maps to environmentLiveStateUpsert action', (done) => {
      const out: unknown[] = [];

      connectConsoleLiveSocket$(actions$ as never, TestBed.inject(ENVIRONMENT), null).subscribe((action) =>
        out.push(action),
      );
      actions$.next(connectConsoleLiveSocket());
      mockSocket.emit('connect');

      const liveState = {
        clientId: 'c1',
        agentId: 'a1',
        git: { indicator: 'clean' },
        chat: { phase: 'idle' },
      };

      mockSocket.emit(CONSOLE_LIVE_SOCKET_EVENTS.environmentStateUpsert, liveState);

      const match = out.find(
        (action) =>
          typeof action === 'object' &&
          action !== null &&
          'type' in action &&
          (action as { type: string }).type === environmentLiveStateUpsert.type,
      ) as ReturnType<typeof environmentLiveStateUpsert> | undefined;

      expect(match?.state).toEqual(liveState);
      done();
    });
  });

  describe('restoreConsoleLiveSocketClient$', () => {
    it('re-emits setClient after reconnect when a workspace was selected', fakeAsync(() => {
      const emitSpy = jest.spyOn(mockSocket, 'emit');

      connectConsoleLiveSocket$(actions$ as never, TestBed.inject(ENVIRONMENT), null).subscribe();
      actions$.next(connectConsoleLiveSocket());
      mockSocket.emit('connect');
      tick();

      Object.defineProperty(mockSocket, 'connected', { value: true, configurable: true });

      restoreConsoleLiveSocketClient$(actions$ as never, TestBed.inject(Store) as never).subscribe();
      actions$.next(connectConsoleLiveSocketSuccess());
      tick();

      expect(emitSpy).toHaveBeenCalledWith('setClient', { clientId: 'workspace-1' });
    }));
  });
});
