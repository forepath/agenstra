import { createAction, props } from '@ngrx/store';

import type { EnvironmentLiveState } from './console-live.types';

export const connectConsoleLiveSocket = createAction('[Console Live Socket] Connect');

export const connectConsoleLiveSocketSuccess = createAction('[Console Live Socket] Connect Success');

export const connectConsoleLiveSocketFailure = createAction(
  '[Console Live Socket] Connect Failure',
  props<{ error: string }>(),
);

export const disconnectConsoleLiveSocket = createAction('[Console Live Socket] Disconnect');

export const disconnectConsoleLiveSocketSuccess = createAction('[Console Live Socket] Disconnect Success');

export const consoleLiveSocketReconnecting = createAction(
  '[Console Live Socket] Reconnecting',
  props<{ attempt: number }>(),
);

export const consoleLiveSocketReconnected = createAction('[Console Live Socket] Reconnected');

export const consoleLiveSocketReconnectError = createAction(
  '[Console Live Socket] Reconnect Error',
  props<{ error: string }>(),
);

export const consoleLiveSocketReconnectFailed = createAction(
  '[Console Live Socket] Reconnect Failed',
  props<{ error: string }>(),
);

export const setConsoleLiveSocketClient = createAction(
  '[Console Live Socket] Set Client',
  props<{ clientId: string }>(),
);

export const setConsoleLiveSocketClientSuccess = createAction(
  '[Console Live Socket] Set Client Success',
  props<{ message: string; clientId: string; snapshot?: EnvironmentLiveState[] }>(),
);

export const consoleLiveSocketError = createAction('[Console Live Socket] Error', props<{ message: string }>());

export const environmentLiveStateUpsert = createAction(
  '[Console Live Socket] Environment State Upsert',
  props<{ state: EnvironmentLiveState }>(),
);

export const environmentLiveStateRemoved = createAction(
  '[Console Live Socket] Environment State Removed',
  props<{ clientId: string; agentId: string }>(),
);

export const clearEnvironmentUnread = createAction(
  '[Console Live Socket] Clear Environment Unread',
  props<{ clientId: string; agentId: string }>(),
);

export const incrementEnvironmentUnread = createAction(
  '[Console Live Socket] Increment Environment Unread',
  props<{ clientId: string; agentId: string }>(),
);

export const hydrateEnvironmentLiveSnapshot = createAction(
  '[Console Live Socket] Hydrate Snapshot',
  props<{ states: EnvironmentLiveState[] }>(),
);
