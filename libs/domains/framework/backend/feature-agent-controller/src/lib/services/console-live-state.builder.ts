import type { GitStatusDto } from '@forepath/framework/backend/feature-agent-manager';

import type {
  EnvironmentGitIndicator,
  EnvironmentLiveChatStateDto,
  EnvironmentLiveGitStateDto,
  EnvironmentLiveStateDto,
} from '../dto/environment-live-state.dto';

export function gitIndicatorFromStatus(status: GitStatusDto | null | undefined): EnvironmentGitIndicator {
  if (!status) {
    return null;
  }

  const hasConflicts = status.files.some((f) => f.status.includes('U'));

  if (hasConflicts) {
    return 'conflict';
  }

  const hasLocalChanges = !status.isClean || status.hasUnpushedCommits;

  if (hasLocalChanges) {
    return 'changes';
  }

  return 'clean';
}

export function buildGitStateFromStatus(status: GitStatusDto | null | undefined): EnvironmentLiveGitStateDto {
  return {
    indicator: gitIndicatorFromStatus(status),
    currentBranch: status?.currentBranch,
  };
}

export function createInitialEnvironmentLiveState(clientId: string, agentId: string): EnvironmentLiveStateDto {
  return {
    clientId,
    agentId,
    git: { indicator: null },
    chat: { phase: 'idle' },
  };
}

export function mergeEnvironmentLiveState(
  current: EnvironmentLiveStateDto,
  patch: Partial<Pick<EnvironmentLiveStateDto, 'git' | 'chat' | 'automation'>>,
): EnvironmentLiveStateDto {
  return {
    ...current,
    git: patch.git ? { ...current.git, ...patch.git } : current.git,
    chat: patch.chat ? { ...current.chat, ...patch.chat } : current.chat,
    automation: patch.automation ? { ...current.automation, ...patch.automation } : current.automation,
  };
}

export function chatStateFromMessage(
  from: 'user' | 'agent',
  timestamp: string,
  originUserId?: string,
): EnvironmentLiveChatStateDto {
  if (from === 'user') {
    return {
      phase: 'waiting_agent',
      lastMessageAt: timestamp,
      lastMessageFrom: 'user',
      lastUserOriginId: originUserId,
    };
  }

  return {
    phase: 'idle',
    lastMessageAt: timestamp,
    lastMessageFrom: 'agent',
  };
}

export function chatStateStreaming(timestamp?: string): EnvironmentLiveChatStateDto {
  return {
    phase: 'streaming',
    lastMessageAt: timestamp,
    lastMessageFrom: 'agent',
  };
}
