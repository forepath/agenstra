export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'draft' | 'todo' | 'prototype' | 'done';
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
