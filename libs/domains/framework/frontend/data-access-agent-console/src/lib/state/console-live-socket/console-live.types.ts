export type EnvironmentGitIndicator = 'clean' | 'changes' | 'conflict' | null;

export type EnvironmentChatPhase = 'idle' | 'waiting_agent' | 'streaming';

export interface EnvironmentLiveGitState {
  indicator: EnvironmentGitIndicator;
  currentBranch?: string;
}

export interface EnvironmentLiveChatState {
  phase: EnvironmentChatPhase;
  lastMessageAt?: string;
  lastMessageFrom?: 'user' | 'agent';
  lastUserOriginId?: string;
}

export interface EnvironmentLiveState {
  clientId: string;
  agentId: string;
  git: EnvironmentLiveGitState;
  chat: EnvironmentLiveChatState;
}

export function environmentLiveStateKey(clientId: string, agentId: string): string {
  return `${clientId}:${agentId}`;
}
