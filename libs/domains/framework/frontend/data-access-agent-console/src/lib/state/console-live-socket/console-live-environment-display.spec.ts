import {
  gitIndicatorTitle,
  resolveEnvironmentActivityDisplay,
  shouldIncrementUnreadOnLiveUpsert,
} from './console-live-environment-display';

describe('console-live-environment-display', () => {
  it('resolveEnvironmentActivityDisplay prioritizes unread', () => {
    expect(resolveEnvironmentActivityDisplay('streaming', 2)).toBe('unread');
  });

  it('resolveEnvironmentActivityDisplay maps chat phases', () => {
    expect(resolveEnvironmentActivityDisplay('waiting_agent', 0)).toBe('waiting');
    expect(resolveEnvironmentActivityDisplay('streaming', 0)).toBe('streaming');
    expect(resolveEnvironmentActivityDisplay('idle', 0)).toBe('idle');
  });

  it('gitIndicatorTitle returns human-readable labels', () => {
    expect(gitIndicatorTitle('changes')).toContain('changes');
  });

  it('shouldIncrementUnreadOnLiveUpsert ignores git-only updates', () => {
    const prev = {
      clientId: 'c1',
      agentId: 'a1',
      git: { indicator: 'clean' as const },
      chat: { phase: 'idle' as const, lastMessageAt: '2026-01-01T00:00:00.000Z' },
    };
    const gitOnly = {
      ...prev,
      git: { indicator: 'changes' as const, currentBranch: 'main' },
    };

    expect(shouldIncrementUnreadOnLiveUpsert(prev, gitOnly)).toBe(false);
  });

  it('shouldIncrementUnreadOnLiveUpsert detects new chat messages', () => {
    const prev = {
      clientId: 'c1',
      agentId: 'a1',
      git: { indicator: null },
      chat: { phase: 'idle' as const, lastMessageAt: '2026-01-01T00:00:00.000Z' },
    };
    const next = {
      ...prev,
      chat: { phase: 'waiting_agent' as const, lastMessageAt: '2026-01-02T00:00:00.000Z' },
    };

    expect(shouldIncrementUnreadOnLiveUpsert(prev, next)).toBe(true);
  });
});
