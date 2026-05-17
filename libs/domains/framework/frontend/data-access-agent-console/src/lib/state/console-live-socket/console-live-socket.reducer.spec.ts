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
  hydrateEnvironmentLiveSnapshot,
  incrementEnvironmentUnread,
  setConsoleLiveSocketClient,
  setConsoleLiveSocketClientSuccess,
} from './console-live-socket.actions';
import {
  consoleLiveSocketReducer,
  initialConsoleLiveSocketState,
  type ConsoleLiveSocketState,
} from './console-live-socket.reducer';
import { environmentLiveStateKey } from './console-live.types';

describe('consoleLiveSocketReducer', () => {
  it('returns initial state for unknown action', () => {
    expect(consoleLiveSocketReducer(undefined, { type: 'UNKNOWN' } as never)).toEqual(initialConsoleLiveSocketState);
  });

  it('connectConsoleLiveSocket sets connecting and clears error', () => {
    const prev: ConsoleLiveSocketState = { ...initialConsoleLiveSocketState, error: 'x' };
    const next = consoleLiveSocketReducer(prev, connectConsoleLiveSocket());

    expect(next.connecting).toBe(true);
    expect(next.disconnecting).toBe(false);
    expect(next.error).toBeNull();
  });

  it('connectConsoleLiveSocketSuccess marks connected', () => {
    const prev: ConsoleLiveSocketState = { ...initialConsoleLiveSocketState, connecting: true, reconnecting: true };
    const next = consoleLiveSocketReducer(prev, connectConsoleLiveSocketSuccess());

    expect(next.connected).toBe(true);
    expect(next.connecting).toBe(false);
    expect(next.reconnecting).toBe(false);
    expect(next.reconnectAttempts).toBe(0);
  });

  it('connectConsoleLiveSocketFailure resets to initial with error', () => {
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      connected: true,
      selectedClientId: 'c1',
    };
    const next = consoleLiveSocketReducer(prev, connectConsoleLiveSocketFailure({ error: 'bad' }));

    expect(next).toEqual({ ...initialConsoleLiveSocketState, error: 'bad' });
  });

  it('disconnectConsoleLiveSocket sets disconnecting', () => {
    const next = consoleLiveSocketReducer(initialConsoleLiveSocketState, disconnectConsoleLiveSocket());

    expect(next.disconnecting).toBe(true);
  });

  it('disconnectConsoleLiveSocketSuccess resets state', () => {
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      connected: true,
      selectedClientId: 'c1',
    };

    expect(consoleLiveSocketReducer(prev, disconnectConsoleLiveSocketSuccess())).toEqual(initialConsoleLiveSocketState);
  });

  it('consoleLiveSocketReconnecting tracks attempt', () => {
    const next = consoleLiveSocketReducer(initialConsoleLiveSocketState, consoleLiveSocketReconnecting({ attempt: 2 }));

    expect(next.reconnecting).toBe(true);
    expect(next.reconnectAttempts).toBe(2);
  });

  it('consoleLiveSocketReconnected clears reconnect flags', () => {
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      reconnecting: true,
      reconnectAttempts: 3,
    };
    const next = consoleLiveSocketReducer(prev, consoleLiveSocketReconnected());

    expect(next.connected).toBe(true);
    expect(next.reconnecting).toBe(false);
    expect(next.reconnectAttempts).toBe(0);
  });

  it('consoleLiveSocketReconnectError stores error', () => {
    const next = consoleLiveSocketReducer(
      initialConsoleLiveSocketState,
      consoleLiveSocketReconnectError({ error: 'e' }),
    );

    expect(next.error).toBe('e');
  });

  it('consoleLiveSocketReconnectFailed clears connected and reconnecting', () => {
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      connected: true,
      reconnecting: true,
    };
    const next = consoleLiveSocketReducer(prev, consoleLiveSocketReconnectFailed({ error: 'gave up' }));

    expect(next.connected).toBe(false);
    expect(next.reconnecting).toBe(false);
    expect(next.error).toBe('gave up');
  });

  it('setConsoleLiveSocketClient marks setting in progress', () => {
    const next = consoleLiveSocketReducer(initialConsoleLiveSocketState, setConsoleLiveSocketClient({ clientId: 'c' }));

    expect(next.settingClient).toBe(true);
    expect(next.settingClientId).toBe('c');
  });

  it('setConsoleLiveSocketClientSuccess stores selected client and hydrates snapshot', () => {
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      settingClient: true,
      settingClientId: 'c1',
    };
    const snapshot = [
      {
        clientId: 'c1',
        agentId: 'a1',
        git: { indicator: 'clean' as const },
        chat: { phase: 'idle' as const },
      },
    ];
    const next = consoleLiveSocketReducer(
      prev,
      setConsoleLiveSocketClientSuccess({ message: 'ok', clientId: 'c1', snapshot }),
    );

    expect(next.selectedClientId).toBe('c1');
    expect(next.settingClient).toBe(false);
    expect(next.entities[environmentLiveStateKey('c1', 'a1')]?.git.indicator).toBe('clean');
  });

  it('consoleLiveSocketError clears setting client and stores message', () => {
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      settingClient: true,
      settingClientId: 'c',
    };
    const next = consoleLiveSocketReducer(prev, consoleLiveSocketError({ message: 'nope' }));

    expect(next.settingClient).toBe(false);
    expect(next.settingClientId).toBeNull();
    expect(next.error).toBe('nope');
  });

  it('environmentLiveStateRemoved removes entity and unread', () => {
    const key = environmentLiveStateKey('c1', 'a1');
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      entities: {
        [key]: { clientId: 'c1', agentId: 'a1', git: { indicator: null }, chat: { phase: 'idle' } },
      },
      unreadByKey: { [key]: 2 },
    };
    const next = consoleLiveSocketReducer(prev, environmentLiveStateRemoved({ clientId: 'c1', agentId: 'a1' }));

    expect(next.entities[key]).toBeUndefined();
    expect(next.unreadByKey[key]).toBeUndefined();
  });

  it('hydrateEnvironmentLiveSnapshot merges states', () => {
    const next = consoleLiveSocketReducer(
      initialConsoleLiveSocketState,
      hydrateEnvironmentLiveSnapshot({
        states: [{ clientId: 'c1', agentId: 'a1', git: { indicator: 'changes' }, chat: { phase: 'streaming' } }],
      }),
    );

    expect(next.entities[environmentLiveStateKey('c1', 'a1')]?.chat.phase).toBe('streaming');
  });

  it('incrementEnvironmentUnread caps at 99', () => {
    const key = environmentLiveStateKey('c1', 'a1');
    const prev: ConsoleLiveSocketState = {
      ...initialConsoleLiveSocketState,
      unreadByKey: { [key]: 99 },
    };
    const next = consoleLiveSocketReducer(prev, incrementEnvironmentUnread({ clientId: 'c1', agentId: 'a1' }));

    expect(next.unreadByKey[key]).toBe(99);
  });

  it('tracks and clears unread counts', () => {
    let state = consoleLiveSocketReducer(
      initialConsoleLiveSocketState,
      incrementEnvironmentUnread({ clientId: 'c1', agentId: 'a1' }),
    );

    expect(state.unreadByKey[environmentLiveStateKey('c1', 'a1')]).toBe(1);

    state = consoleLiveSocketReducer(state, clearEnvironmentUnread({ clientId: 'c1', agentId: 'a1' }));

    expect(state.unreadByKey[environmentLiveStateKey('c1', 'a1')]).toBeUndefined();
  });
});
