/** Mirrors backend `TicketVerifierProfileJson` (JSON over HTTP). */
export interface TicketVerifierProfileJson {
  commands: Array<{ cmd: string; cwd?: string }>;
}

export interface UpdateTicketAutomationDto {
  eligible?: boolean;
  allowedAgentIds?: string[];
  verifierProfile?: TicketVerifierProfileJson;
  requiresApproval?: boolean;
  defaultBranchOverride?: string | null;
}

export type TicketAutomationRunStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'escalated'
  | 'cancelled';

export type TicketAutomationRunPhase = 'pre_improve' | 'workspace_prep' | 'agent_loop' | 'verify' | 'finalize';

export interface TicketAutomationResponseDto {
  ticketId: string;
  eligible: boolean;
  allowedAgentIds: string[];
  verifierProfile: TicketVerifierProfileJson | null;
  requiresApproval: boolean;
  approvedAt: string | null;
  approvedByUserId: string | null;
  approvalBaselineTicketUpdatedAt: string | null;
  defaultBranchOverride: string | null;
  nextRetryAt: string | null;
  consecutiveFailureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketAutomationRunStepResponseDto {
  id: string;
  stepIndex: number;
  phase: string;
  kind: string;
  payload: Record<string, unknown> | null;
  excerpt: string | null;
  createdAt: string;
}

export interface TicketAutomationRunResponseDto {
  id: string;
  ticketId: string;
  clientId: string;
  agentId: string;
  status: TicketAutomationRunStatus;
  phase: TicketAutomationRunPhase;
  ticketStatusBefore: string;
  branchName: string | null;
  baseBranch: string | null;
  baseSha: string | null;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  iterationCount: number;
  completionMarkerSeen: boolean;
  verificationPassed: boolean | null;
  failureCode: string | null;
  summary: Record<string, unknown> | null;
  cancelRequestedAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  steps?: TicketAutomationRunStepResponseDto[];
}
