import { createReducer, on } from '@ngrx/store';
import type { TicketActivityResponseDto, TicketCommentResponseDto, TicketResponseDto } from './tickets.types';
import {
  addTicketComment,
  addTicketCommentFailure,
  addTicketCommentSuccess,
  closeTicketDetail,
  clearTicketsError,
  createTicket,
  createTicketFailure,
  createTicketSuccess,
  deleteTicket,
  deleteTicketFailure,
  deleteTicketSuccess,
  loadTicketDetailBundleSuccess,
  loadTicketDetailFailure,
  loadTickets,
  loadTicketsFailure,
  loadTicketsSuccess,
  openTicketDetail,
  updateTicket,
  updateTicketFailure,
  updateTicketSuccess,
} from './tickets.actions';

export interface TicketsState {
  list: TicketResponseDto[];
  selectedTicketId: string | null;
  detail: TicketResponseDto | null;
  comments: TicketCommentResponseDto[];
  activity: TicketActivityResponseDto[];
  loadingList: boolean;
  loadingDetail: boolean;
  saving: boolean;
  error: string | null;
}

export const initialTicketsState: TicketsState = {
  list: [],
  selectedTicketId: null,
  detail: null,
  comments: [],
  activity: [],
  loadingList: false,
  loadingDetail: false,
  saving: false,
  error: null,
};

function mergeTicketInList(list: TicketResponseDto[], ticket: TicketResponseDto): TicketResponseDto[] {
  const idx = list.findIndex((t) => t.id === ticket.id);
  if (idx < 0) {
    return [...list, ticket];
  }
  const next = [...list];
  next[idx] = ticket;
  return next;
}

/** When a subtask is created while its parent is open in the detail panel, merge it into `detail.children`. */
function mergeCreatedChildIntoDetail(
  detail: TicketResponseDto | null,
  created: TicketResponseDto,
): TicketResponseDto | null {
  if (!detail) {
    return null;
  }
  const parentId = created.parentId ?? null;
  if (!parentId || parentId !== detail.id) {
    return detail;
  }
  const prevChildren = detail.children ?? [];
  const withoutDup = prevChildren.filter((c) => c.id !== created.id);
  return {
    ...detail,
    children: [...withoutDup, created],
  };
}

export const ticketsReducer = createReducer(
  initialTicketsState,
  on(loadTickets, (state) => ({ ...state, loadingList: true, error: null })),
  on(loadTicketsSuccess, (state, { tickets }) => ({
    ...state,
    loadingList: false,
    list: tickets,
  })),
  on(loadTicketsFailure, (state, { error }) => ({ ...state, loadingList: false, error })),
  on(openTicketDetail, (state, { id }) => ({
    ...state,
    selectedTicketId: id,
    loadingDetail: true,
    detail: null,
    comments: [],
    activity: [],
    error: null,
  })),
  on(loadTicketDetailBundleSuccess, (state, { ticket, comments, activity }) => ({
    ...state,
    detail: ticket,
    comments,
    activity,
    loadingDetail: false,
  })),
  on(loadTicketDetailFailure, (state, { error }) => ({
    ...state,
    loadingDetail: false,
    error,
    selectedTicketId: null,
  })),
  on(closeTicketDetail, (state) => ({
    ...state,
    selectedTicketId: null,
    detail: null,
    comments: [],
    activity: [],
  })),
  on(createTicket, (state) => ({ ...state, saving: true, error: null })),
  on(createTicketSuccess, (state, { ticket }) => ({
    ...state,
    saving: false,
    list: mergeTicketInList(state.list, ticket),
    detail: mergeCreatedChildIntoDetail(state.detail, ticket),
  })),
  on(createTicketFailure, (state, { error }) => ({ ...state, saving: false, error })),
  on(updateTicket, (state) => ({ ...state, saving: true, error: null })),
  on(updateTicketSuccess, (state, { ticket, activity }) => ({
    ...state,
    saving: false,
    list: mergeTicketInList(state.list, ticket),
    detail:
      state.detail?.id === ticket.id
        ? {
            ...state.detail,
            ...ticket,
            children: ticket.children ?? state.detail.children,
          }
        : state.detail,
    activity: state.selectedTicketId === ticket.id ? activity : state.activity,
  })),
  on(updateTicketFailure, (state, { error }) => ({ ...state, saving: false, error })),
  on(deleteTicket, (state) => ({ ...state, saving: true, error: null })),
  on(deleteTicketSuccess, (state, { id }) => ({
    ...state,
    saving: false,
    list: state.list.filter((t) => t.id !== id),
    selectedTicketId: state.selectedTicketId === id ? null : state.selectedTicketId,
    detail: state.detail?.id === id ? null : state.detail,
  })),
  on(deleteTicketFailure, (state, { error }) => ({ ...state, saving: false, error })),
  on(addTicketComment, (state) => ({ ...state, saving: true, error: null })),
  on(addTicketCommentSuccess, (state, { comment, activity }) => ({
    ...state,
    saving: false,
    comments: [...state.comments, comment],
    activity: state.selectedTicketId === comment.ticketId ? activity : state.activity,
  })),
  on(addTicketCommentFailure, (state, { error }) => ({ ...state, saving: false, error })),
  on(clearTicketsError, (state) => ({ ...state, error: null })),
);
