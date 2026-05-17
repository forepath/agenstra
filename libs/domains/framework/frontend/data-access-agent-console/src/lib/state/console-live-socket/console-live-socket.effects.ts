import { inject } from '@angular/core';
import { ENVIRONMENT, type Environment } from '@forepath/framework/frontend/util-configuration';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { KeycloakService } from 'keycloak-angular';
import {
  catchError,
  EMPTY,
  filter,
  from,
  fromEvent,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import { io } from 'socket.io-client';

import { selectSelectedClientAgent } from '../agents/agents.selectors';

import { shouldIncrementUnreadOnLiveUpsert } from './console-live-environment-display';
import { getConsoleLiveSocketInstance, setConsoleLiveSocketInstance } from './console-live-socket-instance';
import { resolveConsoleWebsocketUrl } from './console-live-socket-url';
import {
  connectConsoleLiveSocket,
  connectConsoleLiveSocketFailure,
  connectConsoleLiveSocketSuccess,
  consoleLiveSocketError,
  consoleLiveSocketReconnected,
  consoleLiveSocketReconnectError,
  consoleLiveSocketReconnectFailed,
  consoleLiveSocketReconnecting,
  disconnectConsoleLiveSocket,
  disconnectConsoleLiveSocketSuccess,
  environmentLiveStateRemoved,
  environmentLiveStateUpsert,
  incrementEnvironmentUnread,
  setConsoleLiveSocketClientSuccess,
} from './console-live-socket.actions';
import { CONSOLE_LIVE_SOCKET_EVENTS } from './console-live-socket.constants';
import {
  selectConsoleLiveEntities,
  selectConsoleLiveSocketSelectedClientId,
  selectConsoleLiveSocketSettingClient,
} from './console-live-socket.selectors';
import type { EnvironmentLiveState } from './console-live.types';
import { environmentLiveStateKey } from './console-live.types';

const API_KEY_STORAGE_KEY = 'agent-controller-api-key';
const USERS_JWT_STORAGE_KEY = 'agent-controller-users-jwt';

function getAuthHeader(environment: Environment, keycloakService: KeycloakService | null): Observable<string | null> {
  if (environment.authentication.type === 'api-key') {
    const apiKey =
      environment.authentication.apiKey ??
      (typeof localStorage !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE_KEY) : null);

    if (apiKey) {
      return of(`Bearer ${apiKey}`);
    }

    return of(null);
  }

  if (environment.authentication.type === 'keycloak' && keycloakService) {
    return from(keycloakService.getToken()).pipe(
      map((token) => (token ? `Bearer ${token}` : null)),
      catchError(() => of(null)),
    );
  }

  if (environment.authentication.type === 'users') {
    const jwt = typeof localStorage !== 'undefined' ? localStorage.getItem(USERS_JWT_STORAGE_KEY) : null;

    if (jwt) {
      return of(`Bearer ${jwt}`);
    }

    return of(null);
  }

  return of(null);
}

export const connectConsoleLiveSocket$ = createEffect(
  (
    actions$ = inject(Actions),
    environment = inject<Environment>(ENVIRONMENT),
    keycloakService = inject(KeycloakService, { optional: true }),
  ) => {
    return actions$.pipe(
      ofType(connectConsoleLiveSocket),
      switchMap(() => {
        const websocketUrl = resolveConsoleWebsocketUrl(environment);

        if (!websocketUrl) {
          return of(connectConsoleLiveSocketFailure({ error: 'Console WebSocket URL not configured' }));
        }

        const existingSocket = getConsoleLiveSocketInstance();

        if (existingSocket) {
          existingSocket.disconnect();
          setConsoleLiveSocketInstance(null);
        }

        return getAuthHeader(environment, keycloakService).pipe(
          switchMap((authHeader) => {
            const socket = io(websocketUrl, {
              transports: ['websocket'],
              rejectUnauthorized: false,
              reconnection: true,
              reconnectionAttempts: 5,
              reconnectionDelay: 1000,
              reconnectionDelayMax: 5000,
              randomizationFactor: 0.5,
              ...(authHeader && { auth: { Authorization: authHeader } }),
            });

            setConsoleLiveSocketInstance(socket);

            const connectSuccess$ = fromEvent(socket, 'connect').pipe(map(() => connectConsoleLiveSocketSuccess()));
            const connectError$ = fromEvent<Error>(socket, 'connect_error').pipe(
              map((error) => consoleLiveSocketReconnectError({ error: error.message || 'Connection error' })),
            );
            const reconnectAttempt$ = fromEvent<number>(socket, 'reconnect_attempt').pipe(
              map((attempt) => consoleLiveSocketReconnecting({ attempt })),
            );
            const reconnecting$ = fromEvent<number>(socket, 'reconnecting').pipe(
              map((attempt) => consoleLiveSocketReconnecting({ attempt })),
            );
            const reconnect$ = fromEvent(socket, 'reconnect').pipe(map(() => consoleLiveSocketReconnected()));
            const reconnectError$ = fromEvent<Error>(socket, 'reconnect_error').pipe(
              map((error) => consoleLiveSocketReconnectError({ error: error.message || 'Reconnection error' })),
            );
            const reconnectFailed$ = fromEvent(socket, 'reconnect_failed').pipe(
              map(() => {
                setConsoleLiveSocketInstance(null);

                return consoleLiveSocketReconnectFailed({ error: 'Reconnection failed after all attempts' });
              }),
            );
            const setClientSuccess$ = fromEvent<{
              message: string;
              clientId: string;
              snapshot?: EnvironmentLiveState[];
            }>(socket, 'setClientSuccess').pipe(
              map((data) =>
                setConsoleLiveSocketClientSuccess({
                  message: data.message,
                  clientId: data.clientId,
                  snapshot: data.snapshot,
                }),
              ),
            );
            const error$ = fromEvent<{ message: string }>(socket, 'error').pipe(
              map((data) => consoleLiveSocketError({ message: data.message })),
            );
            const stateUpsert$ = fromEvent(socket, CONSOLE_LIVE_SOCKET_EVENTS.environmentStateUpsert).pipe(
              map((payload) => environmentLiveStateUpsert({ state: payload as EnvironmentLiveState })),
            );
            const stateRemoved$ = fromEvent(socket, CONSOLE_LIVE_SOCKET_EVENTS.environmentStateRemoved).pipe(
              map((payload) => {
                const p = payload as { clientId: string; agentId: string };

                return environmentLiveStateRemoved({ clientId: p.clientId, agentId: p.agentId });
              }),
            );

            return merge(
              connectSuccess$,
              connectError$,
              reconnectAttempt$,
              reconnecting$,
              reconnect$,
              reconnectError$,
              reconnectFailed$,
              setClientSuccess$,
              error$,
              stateUpsert$,
              stateRemoved$,
            );
          }),
        );
      }),
    );
  },
  { functional: true, dispatch: true },
);

export const disconnectConsoleLiveSocket$ = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(disconnectConsoleLiveSocket),
      tap(() => {
        const activeSocket = getConsoleLiveSocketInstance();

        if (activeSocket) {
          activeSocket.disconnect();
          setConsoleLiveSocketInstance(null);
        }
      }),
      map(() => disconnectConsoleLiveSocketSuccess()),
    );
  },
  { functional: true, dispatch: true },
);

export const incrementUnreadOnEnvironmentLiveUpsert$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) => {
    return actions$.pipe(
      ofType(environmentLiveStateUpsert),
      withLatestFrom(store.select(selectConsoleLiveEntities), store.select(selectConsoleLiveSocketSelectedClientId)),
      filter(([{ state }, entities]) => {
        const key = environmentLiveStateKey(state.clientId, state.agentId);

        return shouldIncrementUnreadOnLiveUpsert(entities[key], state);
      }),
      switchMap(([{ state }, , selectedClientId]) => {
        if (!selectedClientId || selectedClientId !== state.clientId) {
          return of(incrementEnvironmentUnread({ clientId: state.clientId, agentId: state.agentId }));
        }

        return store.select(selectSelectedClientAgent(selectedClientId)).pipe(
          take(1),
          mergeMap((selectedAgent) =>
            selectedAgent?.id === state.agentId
              ? EMPTY
              : of(incrementEnvironmentUnread({ clientId: state.clientId, agentId: state.agentId })),
          ),
        );
      }),
    );
  },
  { functional: true, dispatch: true },
);

export const restoreConsoleLiveSocketClient$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) => {
    return actions$.pipe(
      ofType(connectConsoleLiveSocketSuccess, consoleLiveSocketReconnected),
      withLatestFrom(
        store.select(selectConsoleLiveSocketSelectedClientId),
        store.select(selectConsoleLiveSocketSettingClient),
      ),
      filter(([, clientId]) => !!clientId),
      tap(([, clientId]) => {
        const socket = getConsoleLiveSocketInstance();

        if (socket?.connected && clientId) {
          socket.emit('setClient', { clientId });
        }
      }),
    );
  },
  { functional: true, dispatch: false },
);
