import { TicketPriority, TicketStatus } from '../../entities/ticket.enums';

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
}
