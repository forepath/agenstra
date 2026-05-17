import type { GitStatusDto } from '@forepath/framework/backend/feature-agent-manager';

import {
  buildGitStateFromStatus,
  chatStateFromMessage,
  chatStateStreaming,
  createInitialEnvironmentLiveState,
  gitIndicatorFromStatus,
  mergeEnvironmentLiveState,
} from './console-live-state.builder';

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

  it('gitIndicatorFromStatus returns null without status', () => {
    expect(gitIndicatorFromStatus(null)).toBeNull();
  });

  it('createInitialEnvironmentLiveState returns idle defaults', () => {
    expect(createInitialEnvironmentLiveState('c1', 'a1')).toEqual({
      clientId: 'c1',
      agentId: 'a1',
      git: { indicator: null },
      chat: { phase: 'idle' },
    });
  });

  it('mergeEnvironmentLiveState merges git, chat, and automation patches', () => {
    const current = createInitialEnvironmentLiveState('c1', 'a1');
    const next = mergeEnvironmentLiveState(current, {
      git: { indicator: 'changes', currentBranch: 'dev' },
      chat: { phase: 'streaming' },
      automation: { lastRunStatus: 'succeeded', runId: 'r1' },
    });

    expect(next.git.indicator).toBe('changes');
    expect(next.chat.phase).toBe('streaming');
    expect(next.automation?.runId).toBe('r1');
  });

  it('chatStateFromMessage maps agent replies to idle', () => {
    expect(chatStateFromMessage('agent', '2020-01-01T00:00:00.000Z')).toEqual({
      phase: 'idle',
      lastMessageAt: '2020-01-01T00:00:00.000Z',
      lastMessageFrom: 'agent',
    });
  });

  it('chatStateStreaming marks streaming phase', () => {
    expect(chatStateStreaming('2020-01-01T00:00:00.000Z')).toEqual({
      phase: 'streaming',
      lastMessageAt: '2020-01-01T00:00:00.000Z',
      lastMessageFrom: 'agent',
    });
  });
});
