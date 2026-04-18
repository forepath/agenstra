export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'draft' | 'todo' | 'in_progress' | 'prototype' | 'done' | 'closed';
export type TicketActorType = 'human' | 'ai' | 'system';

export interface TicketResponseDto {
  id: string;
  clientId: string;
  parentId?: string | null;
  title: string;
  content?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  /** Preferred workspace agent for chat/AI when viewing this ticket. */
  preferredChatAgentId?: string | null;
  /** True when autonomous prototyping is enabled for this ticket. */
  automationEligible: boolean;
  createdAt: string;
  updatedAt: string;
  children?: TicketResponseDto[];
}

export interface CreateTicketDto {
  clientId?: string;
  parentId?: string | null;
  title: string;
  content?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
}

export interface UpdateTicketDto {
  clientId?: string;
  parentId?: string | null;
  title?: string;
  content?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  preferredChatAgentId?: string | null;
}

export interface TicketCommentResponseDto {
  id: string;
  ticketId: string;
  authorUserId?: string | null;
  authorEmail?: string | null;
  body: string;
  createdAt: string;
}

export interface TicketActivityResponseDto {
  id: string;
  ticketId: string;
  occurredAt: string;
  actorType: TicketActorType;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actionType: string;
  payload: Record<string, unknown>;
}

export interface PrototypePromptResponseDto {
  prompt: string;
}

export interface StartBodyGenerationSessionResponseDto {
  generationId: string;
  expiresAt: string;
  activity: TicketActivityResponseDto;
}

export interface ListTicketsParams {
  clientId?: string;
  status?: TicketStatus;
  parentId?: string | null;
}
