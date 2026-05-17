import { createReducer, on } from '@ngrx/store';

import {
  clearEnvironmentUnread,
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
  hydrateEnvironmentLiveSnapshot,
  incrementEnvironmentUnread,
  setConsoleLiveSocketClient,
  setConsoleLiveSocketClientSuccess,
} from './console-live-socket.actions';
import { environmentLiveStateKey, type EnvironmentLiveState } from './console-live.types';

export interface ConsoleLiveSocketState {
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  selectedClientId: string | null;
  settingClient: boolean;
  settingClientId: string | null;
  error: string | null;
  entities: Record<string, EnvironmentLiveState>;
  unreadByKey: Record<string, number>;
}

export const initialConsoleLiveSocketState: ConsoleLiveSocketState = {
  connected: false,
  connecting: false,
  disconnecting: false,
  reconnecting: false,
  reconnectAttempts: 0,
  selectedClientId: null,
  settingClient: false,
  settingClientId: null,
  error: null,
  entities: {},
  unreadByKey: {},
};

function upsertEntity(
  entities: Record<string, EnvironmentLiveState>,
  state: EnvironmentLiveState,
): Record<string, EnvironmentLiveState> {
  const key = environmentLiveStateKey(state.clientId, state.agentId);

  return { ...entities, [key]: state };
}

export const consoleLiveSocketReducer = createReducer(
  initialConsoleLiveSocketState,
  on(connectConsoleLiveSocket, (state) => ({
    ...state,
    connecting: true,
    disconnecting: false,
    error: null,
  })),
  on(connectConsoleLiveSocketSuccess, (state) => ({
    ...state,
    connected: true,
    connecting: false,
    reconnecting: false,
    reconnectAttempts: 0,
    error: null,
  })),
  on(connectConsoleLiveSocketFailure, (state, { error }) => ({
    ...initialConsoleLiveSocketState,
    error,
  })),
  on(disconnectConsoleLiveSocket, (state) => ({
    ...state,
    disconnecting: true,
    error: null,
  })),
  on(disconnectConsoleLiveSocketSuccess, () => ({ ...initialConsoleLiveSocketState })),
  on(consoleLiveSocketReconnecting, (state, { attempt }) => ({
    ...state,
    reconnecting: true,
    reconnectAttempts: attempt,
  })),
  on(consoleLiveSocketReconnected, (state) => ({
    ...state,
    connected: true,
    reconnecting: false,
    reconnectAttempts: 0,
  })),
  on(consoleLiveSocketReconnectError, (state, { error }) => ({
    ...state,
    error,
  })),
  on(consoleLiveSocketReconnectFailed, (state, { error }) => ({
    ...state,
    connected: false,
    reconnecting: false,
    error,
  })),
  on(setConsoleLiveSocketClient, (state, { clientId }) => ({
    ...state,
    settingClient: true,
    settingClientId: clientId,
    error: null,
  })),
  on(setConsoleLiveSocketClientSuccess, (state, { clientId, snapshot }) => {
    let entities = state.entities;

    if (snapshot?.length) {
      for (const item of snapshot) {
        entities = upsertEntity(entities, item);
      }
    }

    return {
      ...state,
      selectedClientId: clientId,
      settingClient: false,
      settingClientId: null,
      error: null,
      entities,
    };
  }),
  on(consoleLiveSocketError, (state, { message }) => ({
    ...state,
    settingClient: false,
    settingClientId: null,
    error: message,
  })),
  on(environmentLiveStateUpsert, (state, { state: liveState }) => ({
    ...state,
    entities: upsertEntity(state.entities, liveState),
  })),
  on(environmentLiveStateRemoved, (state, { clientId, agentId }) => {
    const key = environmentLiveStateKey(clientId, agentId);
    const { [key]: _removed, ...entities } = state.entities;
    const { [key]: _unread, ...unreadByKey } = state.unreadByKey;

    return { ...state, entities, unreadByKey };
  }),
  on(hydrateEnvironmentLiveSnapshot, (state, { states }) => {
    let entities = state.entities;

    for (const item of states) {
      entities = upsertEntity(entities, item);
    }

    return { ...state, entities };
  }),
  on(clearEnvironmentUnread, (state, { clientId, agentId }) => {
    const key = environmentLiveStateKey(clientId, agentId);
    const { [key]: _removed, ...unreadByKey } = state.unreadByKey;

    return { ...state, unreadByKey };
  }),
  on(incrementEnvironmentUnread, (state, { clientId, agentId }) => {
    const key = environmentLiveStateKey(clientId, agentId);
    const current = state.unreadByKey[key] ?? 0;

    return {
      ...state,
      unreadByKey: { ...state.unreadByKey, [key]: Math.min(current + 1, 99) },
    };
  }),
);
