import { createReducer, on } from '@ngrx/store';
import type { ServerInfoResponse } from '../../types/billing.types';
import {
  loadOverviewServerInfo,
  loadOverviewServerInfoFailure,
  loadOverviewServerInfoSuccess,
  refreshSubscriptionServerInfoSuccess,
  restartServer,
  restartServerFailure,
  restartServerSuccess,
  startServer,
  startServerFailure,
  startServerSuccess,
  stopServer,
  stopServerFailure,
  stopServerSuccess,
} from './subscription-server-info.actions';

export type ServerActionType = 'start' | 'stop' | 'restart';

export interface SubscriptionServerInfoState {
  serverInfoBySubscriptionId: Record<string, ServerInfoResponse>;
  activeItemIdBySubscriptionId: Record<string, string>;
  loading: boolean;
  error: string | null;
  actionInProgress: Record<string, ServerActionType>;
}

export const initialSubscriptionServerInfoState: SubscriptionServerInfoState = {
  serverInfoBySubscriptionId: {},
  activeItemIdBySubscriptionId: {},
  loading: false,
  error: null,
  actionInProgress: {},
};

function setActionInProgress(
  state: SubscriptionServerInfoState,
  subscriptionId: string,
  action: ServerActionType | null,
): Record<string, ServerActionType> {
  const next = { ...state.actionInProgress };
  if (action === null) {
    delete next[subscriptionId];
  } else {
    next[subscriptionId] = action;
  }
  return next;
}

export const subscriptionServerInfoReducer = createReducer(
  initialSubscriptionServerInfoState,
  on(loadOverviewServerInfo, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadOverviewServerInfoSuccess, (state, { serverInfoBySubscriptionId, activeItemIdBySubscriptionId }) => ({
    ...state,
    serverInfoBySubscriptionId,
    activeItemIdBySubscriptionId,
    loading: false,
    error: null,
  })),
  on(loadOverviewServerInfoFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(refreshSubscriptionServerInfoSuccess, (state, { subscriptionId, serverInfo }) => ({
    ...state,
    serverInfoBySubscriptionId: { ...state.serverInfoBySubscriptionId, [subscriptionId]: serverInfo },
  })),
  on(startServer, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, 'start'),
  })),
  on(startServerSuccess, (state, { subscriptionId }) => {
    const nextActionInProgress = setActionInProgress(state, subscriptionId, null);
    const existing = state.serverInfoBySubscriptionId[subscriptionId];
    const serverInfoBySubscriptionId = existing
      ? { ...state.serverInfoBySubscriptionId, [subscriptionId]: { ...existing, status: 'running' } }
      : state.serverInfoBySubscriptionId;
    return { ...state, actionInProgress: nextActionInProgress, serverInfoBySubscriptionId };
  }),
  on(startServerFailure, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, null),
  })),
  on(stopServer, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, 'stop'),
  })),
  on(stopServerSuccess, (state, { subscriptionId }) => {
    const nextActionInProgress = setActionInProgress(state, subscriptionId, null);
    const existing = state.serverInfoBySubscriptionId[subscriptionId];
    const serverInfoBySubscriptionId = existing
      ? { ...state.serverInfoBySubscriptionId, [subscriptionId]: { ...existing, status: 'off' } }
      : state.serverInfoBySubscriptionId;
    return { ...state, actionInProgress: nextActionInProgress, serverInfoBySubscriptionId };
  }),
  on(stopServerFailure, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, null),
  })),
  on(restartServer, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, 'restart'),
  })),
  on(restartServerSuccess, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, null),
  })),
  on(restartServerFailure, (state, { subscriptionId }) => ({
    ...state,
    actionInProgress: setActionInProgress(state, subscriptionId, null),
  })),
);
