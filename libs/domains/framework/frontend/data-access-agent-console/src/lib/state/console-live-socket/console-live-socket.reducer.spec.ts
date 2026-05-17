import {
  environmentLiveStateUpsert,
  incrementEnvironmentUnread,
  clearEnvironmentUnread,
} from './console-live-socket.actions';
import { consoleLiveSocketReducer, initialConsoleLiveSocketState } from './console-live-socket.reducer';
import { environmentLiveStateKey } from './console-live.types';

describe('consoleLiveSocketReducer', () => {
  it('upserts environment live state by client and agent key', () => {
    const state = consoleLiveSocketReducer(
      initialConsoleLiveSocketState,
      environmentLiveStateUpsert({
        state: {
          clientId: 'c1',
          agentId: 'a1',
          git: { indicator: 'changes', currentBranch: 'main' },
          chat: { phase: 'idle' },
        },
      }),
    );

    expect(state.entities[environmentLiveStateKey('c1', 'a1')]?.git.indicator).toBe('changes');
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
