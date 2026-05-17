import type { EnvironmentChatPhase, EnvironmentGitIndicator, EnvironmentLiveState } from './console-live.types';

export type EnvironmentActivityDisplay = 'idle' | 'waiting' | 'streaming' | 'unread';

export function resolveEnvironmentActivityDisplay(
  phase: EnvironmentChatPhase,
  unreadCount: number,
): EnvironmentActivityDisplay {
  if (unreadCount > 0) {
    return 'unread';
  }

  if (phase === 'waiting_agent') {
    return 'waiting';
  }

  if (phase === 'streaming') {
    return 'streaming';
  }

  return 'idle';
}

/** True when upsert reflects new chat traffic (not git-only refresh). */
export function shouldIncrementUnreadOnLiveUpsert(
  previous: EnvironmentLiveState | undefined,
  next: EnvironmentLiveState,
): boolean {
  const nextAt = next.chat.lastMessageAt;

  if (!nextAt) {
    return false;
  }

  return nextAt !== previous?.chat.lastMessageAt;
}

export function gitIndicatorTitle(indicator: EnvironmentGitIndicator): string {
  switch (indicator) {
    case 'clean':
      return 'Git repository is clean';
    case 'changes':
      return 'Git repository has local changes';
    case 'conflict':
      return 'Git merge conflicts detected';
    default:
      return 'Git status unknown';
  }
}
