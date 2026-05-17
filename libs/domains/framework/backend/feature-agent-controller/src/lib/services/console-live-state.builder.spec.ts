import type { GitStatusDto } from '@forepath/framework/backend/feature-agent-manager';

import { buildGitStateFromStatus, chatStateFromMessage, gitIndicatorFromStatus } from './console-live-state.builder';

describe('console-live-state.builder', () => {
  const baseStatus = (overrides: Partial<GitStatusDto>): GitStatusDto => ({
    currentBranch: 'main',
    isClean: true,
    hasUnpushedCommits: false,
    aheadCount: 0,
    behindCount: 0,
    files: [],
    ...overrides,
  });

  it('gitIndicatorFromStatus returns conflict when unmerged files exist', () => {
    expect(gitIndicatorFromStatus(baseStatus({ files: [{ path: 'a', status: 'UU', type: 'both' }] }))).toBe('conflict');
  });

  it('gitIndicatorFromStatus returns changes when dirty or unpushed', () => {
    expect(gitIndicatorFromStatus(baseStatus({ isClean: false }))).toBe('changes');
    expect(gitIndicatorFromStatus(baseStatus({ hasUnpushedCommits: true }))).toBe('changes');
  });

  it('gitIndicatorFromStatus returns clean when synced', () => {
    expect(gitIndicatorFromStatus(baseStatus({}))).toBe('clean');
  });

  it('chatStateFromMessage sets waiting_agent for user messages', () => {
    expect(chatStateFromMessage('user', '2020-01-01T00:00:00.000Z', 'user-1')).toEqual({
      phase: 'waiting_agent',
      lastMessageAt: '2020-01-01T00:00:00.000Z',
      lastMessageFrom: 'user',
      lastUserOriginId: 'user-1',
    });
  });

  it('buildGitStateFromStatus includes branch name', () => {
    expect(buildGitStateFromStatus(baseStatus({ currentBranch: 'feature/x' }))).toEqual({
      indicator: 'clean',
      currentBranch: 'feature/x',
    });
  });
});
