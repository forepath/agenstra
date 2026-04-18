import { TicketPriority, TicketStatus } from '../../entities/ticket.enums';
import { TicketActivityResponseDto } from './ticket-activity-response.dto';

export class TicketResponseDto {
  id!: string;
  clientId!: string;
  parentId?: string | null;
  title!: string;
  content?: string | null;
  priority!: TicketPriority;
  status!: TicketStatus;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  /** Preferred workspace agent for chat/AI when viewing this ticket. */
  preferredChatAgentId?: string | null;
  /** True when autonomous prototyping is enabled for this ticket (`ticket_automation.eligible`). */
  automationEligible!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  children?: TicketResponseDto[];
}

export class PrototypePromptResponseDto {
  prompt!: string;
}

export class StartBodyGenerationSessionResponseDto {
  generationId!: string;
  expiresAt!: string;
  /** Activity row created for this session (same as in GET …/activity, newest-first order). */
  activity!: TicketActivityResponseDto;
}
