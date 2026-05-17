/** Git indicator aligned with frontend `selectGitStatusIndicator`. */
export type EnvironmentGitIndicator = 'clean' | 'changes' | 'conflict' | null;

export type EnvironmentChatPhase = 'idle' | 'waiting_agent' | 'streaming';

export type EnvironmentAutomationRunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface EnvironmentLiveGitStateDto {
  indicator: EnvironmentGitIndicator;
  currentBranch?: string;
}

export interface EnvironmentLiveChatStateDto {
  phase: EnvironmentChatPhase;
  lastMessageAt?: string;
  lastMessageFrom?: 'user' | 'agent';
  lastUserOriginId?: string;
}

export interface EnvironmentLiveAutomationStateDto {
  lastRunStatus?: EnvironmentAutomationRunStatus;
  lastRunAt?: string;
  runId?: string;
}

/**
 * Per-environment live snapshot emitted on the `console` Socket.IO namespace.
 */
export interface EnvironmentLiveStateDto {
  clientId: string;
  agentId: string;
  git: EnvironmentLiveGitStateDto;
  chat: EnvironmentLiveChatStateDto;
  automation?: EnvironmentLiveAutomationStateDto;
}
