import type { TicketVerifierProfileJson } from '../../entities/ticket-automation.entity';

export class TicketAutomationResponseDto {
  ticketId!: string;
  eligible!: boolean;
  allowedAgentIds!: string[];
  verifierProfile!: TicketVerifierProfileJson | null;
  requiresApproval!: boolean;
  approvedAt!: Date | null;
  approvedByUserId!: string | null;
  approvalBaselineTicketUpdatedAt!: Date | null;
  defaultBranchOverride!: string | null;
  nextRetryAt!: Date | null;
  consecutiveFailureCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
