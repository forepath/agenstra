import { initialConsoleLiveSocketState } from './console-live-socket.reducer';
import {
  selectConsoleLiveSocketConnected,
  selectConsoleLiveSocketConnecting,
  selectConsoleLiveSocketError,
  selectConsoleLiveSocketSelectedClientId,
  selectEnvironmentChatPhase,
  selectEnvironmentGitBranch,
  selectEnvironmentGitIndicator,
  selectEnvironmentLiveState,
  selectEnvironmentUnreadCount,
} from './console-live-socket.selectors';
import { environmentLiveStateKey } from './console-live.types';

describe('consoleLiveSocketSelectors', () => {
  const key = environmentLiveStateKey('c1', 'a1');
  const state = {
    consoleLiveSocket: {
      ...initialConsoleLiveSocketState,
      connected: true,
      connecting: false,
      selectedClientId: 'c1',
      error: 'err',
      entities: {
        [key]: {
          clientId: 'c1',
          agentId: 'a1',
          git: { indicator: 'changes' as const, currentBranch: 'main' },
          chat: { phase: 'waiting_agent' as const },
        },
      },
      unreadByKey: { [key]: 3 },
    },
  };

  it('selects connection flags and selected client', () => {
    expect(selectConsoleLiveSocketConnected(state)).toBe(true);
    expect(selectConsoleLiveSocketConnecting(state)).toBe(false);
    expect(selectConsoleLiveSocketSelectedClientId(state)).toBe('c1');
    expect(selectConsoleLiveSocketError(state)).toBe('err');
  });

  it('selects environment live state and derived fields', () => {
    expect(selectEnvironmentLiveState('c1', 'a1')(state)?.git.indicator).toBe('changes');
    expect(selectEnvironmentUnreadCount('c1', 'a1')(state)).toBe(3);
    expect(selectEnvironmentGitIndicator('c1', 'a1')(state)).toBe('changes');
    expect(selectEnvironmentGitBranch('c1', 'a1')(state)).toBe('main');
    expect(selectEnvironmentChatPhase('c1', 'a1')(state)).toBe('waiting_agent');
  });

  it('returns defaults when environment state is missing', () => {
    expect(selectEnvironmentLiveState('x', 'y')(state)).toBeNull();
    expect(selectEnvironmentUnreadCount('x', 'y')(state)).toBe(0);
    expect(selectEnvironmentGitIndicator('x', 'y')(state)).toBeNull();
    expect(selectEnvironmentGitBranch('x', 'y')(state)).toBeNull();
    expect(selectEnvironmentChatPhase('x', 'y')(state)).toBe('idle');
  });
});
