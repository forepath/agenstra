import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { TicketEntity } from './ticket.entity';

/** JSON shape for verifier profile stored in DB (validated on write). */
export type TicketVerifierProfileJson = {
  commands: Array<{ cmd: string; cwd?: string }>;
};

@Entity('ticket_automation')
export class TicketAutomationEntity {
  @PrimaryColumn('uuid', { name: 'ticket_id' })
  ticketId!: string;

  @OneToOne(() => TicketEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: TicketEntity;

  @Column({ type: 'boolean', name: 'eligible', default: false })
  eligible!: boolean;

  /**
   * When empty, any agent with prototype autonomy enabled for this client may run the ticket.
   * When non-empty, only listed agent ids are eligible (still require autonomy.enabled).
   */
  @Column({ type: 'jsonb', name: 'allowed_agent_ids', default: () => "'[]'" })
  allowedAgentIds!: string[];

  @Column({ type: 'jsonb', name: 'verifier_profile', nullable: true })
  verifierProfile?: TicketVerifierProfileJson | null;

  @Column({ type: 'boolean', name: 'requires_approval', default: false })
  requiresApproval!: boolean;

  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'uuid', name: 'approved_by_user_id', nullable: true })
  approvedByUserId?: string | null;

  @Column({ type: 'timestamptz', name: 'approval_baseline_ticket_updated_at', nullable: true })
  approvalBaselineTicketUpdatedAt?: Date | null;

  @Column({ type: 'varchar', name: 'default_branch_override', length: 256, nullable: true })
  defaultBranchOverride?: string | null;

  @Column({ type: 'timestamptz', name: 'next_retry_at', nullable: true })
  nextRetryAt?: Date | null;

  @Column({ type: 'int', name: 'consecutive_failure_count', default: 0 })
  consecutiveFailureCount!: number;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
