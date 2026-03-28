import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { SocketsState } from './sockets.reducer';

export const selectSocketsState = createFeatureSelector<SocketsState>('sockets');

// Connection state selectors
export const selectSocketConnected = createSelector(selectSocketsState, (state) => state.connected);

export const selectSocketConnecting = createSelector(selectSocketsState, (state) => state.connecting);

export const selectSocketDisconnecting = createSelector(selectSocketsState, (state) => state.disconnecting);

// Client context selectors
export const selectSelectedClientId = createSelector(selectSocketsState, (state) => state.selectedClientId);

export const selectSettingClient = createSelector(selectSocketsState, (state) => state.settingClient);

export const selectSettingClientId = createSelector(selectSocketsState, (state) => state.settingClientId);

export const selectChatModel = createSelector(selectSocketsState, (state) => state.chatModel);

// Forwarding state selectors
export const selectSocketForwarding = createSelector(selectSocketsState, (state) => state.forwarding);

// Select forwarding state for chat events only
export const selectChatForwarding = createSelector(
  selectSocketsState,
  (state) => state.forwarding && state.forwardingEvent === 'chat',
);

export const selectChatEnhancementPending = createSelector(
  selectSocketsState,
  (state) => state.chatEnhancementPendingCorrelationId !== null,
);

export const selectChatEnhancementLastResult = createSelector(
  selectSocketsState,
  (state) => state.chatEnhancementLastResult,
);

export const selectTicketBodyGenerationPending = createSelector(
  selectSocketsState,
  (state) => state.ticketBodyPendingCorrelationId !== null,
);

export const selectTicketBodyLastResult = createSelector(selectSocketsState, (state) => state.ticketBodyLastResult);

// Error selector
export const selectSocketError = createSelector(selectSocketsState, (state) => state.error);

// Reconnection state selectors (main socket)
export const selectSocketReconnecting = createSelector(selectSocketsState, (state) => state.reconnecting);
export const selectSocketReconnectAttempts = createSelector(selectSocketsState, (state) => state.reconnectAttempts);

// Remote connection state selectors (per clientId)
export const selectRemoteConnections = createSelector(selectSocketsState, (state) => state.remoteConnections);

/**
 * Select remote connection state for a specific clientId
 */
export const selectRemoteConnectionState = (clientId: string) =>
  createSelector(selectRemoteConnections, (connections) => connections[clientId] || null);

/**
 * Select whether a remote connection is reconnecting for a specific clientId
 */
export const selectIsRemoteReconnecting = (clientId: string) =>
  createSelector(selectRemoteConnectionState(clientId), (connection) => connection?.reconnecting ?? false);

/**
 * Select the last error for a remote connection for a specific clientId
 */
export const selectRemoteConnectionError = (clientId: string) =>
  createSelector(selectRemoteConnectionState(clientId), (connection) => connection?.lastError ?? null);

// Forwarded events selectors
export const selectForwardedEvents = createSelector(selectSocketsState, (state) => state.forwardedEvents);

/**
 * Select forwarded events for a specific event name
 * Uses a memoized selector factory to ensure proper memoization
 */
export const selectForwardedEventsByEvent = (eventName: string) =>
  createSelector(selectForwardedEvents, (events) => {
    const filtered = events.filter((e) => e.event === eventName);
    // Return a new array reference only if the filtered result actually changed
    // This helps with distinctUntilChanged in observables
    return filtered;
  });

/**
 * Select the most recent forwarded event
 */
export const selectMostRecentForwardedEvent = createSelector(selectForwardedEvents, (events) =>
  events.length > 0 ? events[events.length - 1] : null,
);

/**
 * Select the most recent forwarded event for a specific event name
 */
export const selectMostRecentForwardedEventByEvent = (eventName: string) =>
  createSelector(selectForwardedEvents, (events) => {
    const filtered = events.filter((e) => e.event === eventName);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  });

/**
 * Select the currently selected agent ID (from loginSuccess)
 */
export const selectSelectedAgentId = createSelector(selectSocketsState, (state) => state.selectedAgentId);

// Message filter results selectors
export const selectMessageFilterResults = createSelector(selectSocketsState, (state) => state.messageFilterResults);

/**
 * Select message filter results for a specific direction and message timestamp
 * Matches filter results to messages by finding the closest filter result timestamp
 */
export const selectFilterResultForMessage = (direction: 'incoming' | 'outgoing', messageTimestamp: number) =>
  createSelector(selectMessageFilterResults, (filterResults) => {
    // Find filter results matching the direction
    const matchingDirection = filterResults.filter((fr) => fr.direction === direction);
    if (matchingDirection.length === 0) {
      return null;
    }

    // Find the filter result with timestamp closest to the message timestamp
    // Allow a small time window (e.g., 5 seconds) for matching
    const TIME_WINDOW_MS = 5000;
    const candidates = matchingDirection.filter((fr) => Math.abs(fr.timestamp - messageTimestamp) <= TIME_WINDOW_MS);

    if (candidates.length === 0) {
      return null;
    }

    // Return the closest match
    return candidates.reduce((closest, current) =>
      Math.abs(current.timestamp - messageTimestamp) < Math.abs(closest.timestamp - messageTimestamp)
        ? current
        : closest,
    );
  });
