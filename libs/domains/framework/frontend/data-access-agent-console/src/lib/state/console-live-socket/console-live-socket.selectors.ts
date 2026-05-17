import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { ConsoleLiveSocketState } from './console-live-socket.reducer';
import { environmentLiveStateKey } from './console-live.types';

export const selectConsoleLiveSocketState = createFeatureSelector<ConsoleLiveSocketState>('consoleLiveSocket');

export const selectConsoleLiveSocketConnected = createSelector(selectConsoleLiveSocketState, (s) => s.connected);

export const selectConsoleLiveSocketConnecting = createSelector(selectConsoleLiveSocketState, (s) => s.connecting);

export const selectConsoleLiveSocketDisconnecting = createSelector(
  selectConsoleLiveSocketState,
  (s) => s.disconnecting,
);

export const selectConsoleLiveSocketSelectedClientId = createSelector(
  selectConsoleLiveSocketState,
  (s) => s.selectedClientId,
);

export const selectConsoleLiveSocketSettingClient = createSelector(
  selectConsoleLiveSocketState,
  (s) => s.settingClient,
);

export const selectConsoleLiveSocketError = createSelector(selectConsoleLiveSocketState, (s) => s.error);

export const selectConsoleLiveEntities = createSelector(selectConsoleLiveSocketState, (s) => s.entities);

export const selectConsoleLiveUnreadByKey = createSelector(selectConsoleLiveSocketState, (s) => s.unreadByKey);

export const selectEnvironmentLiveState = (clientId: string, agentId: string) =>
  createSelector(selectConsoleLiveEntities, (entities) => entities[environmentLiveStateKey(clientId, agentId)] ?? null);

export const selectEnvironmentUnreadCount = (clientId: string, agentId: string) =>
  createSelector(selectConsoleLiveUnreadByKey, (unread) => unread[environmentLiveStateKey(clientId, agentId)] ?? 0);

export const selectEnvironmentGitIndicator = (clientId: string, agentId: string) =>
  createSelector(selectEnvironmentLiveState(clientId, agentId), (state) => state?.git.indicator ?? null);

export const selectEnvironmentGitBranch = (clientId: string, agentId: string) =>
  createSelector(selectEnvironmentLiveState(clientId, agentId), (state) => state?.git.currentBranch ?? null);

export const selectEnvironmentChatPhase = (clientId: string, agentId: string) =>
  createSelector(selectEnvironmentLiveState(clientId, agentId), (state) => state?.chat.phase ?? 'idle');
