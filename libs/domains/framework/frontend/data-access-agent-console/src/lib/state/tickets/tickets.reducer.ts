import { createReducer, on } from '@ngrx/store';
import {
  approveTicketAutomationSuccess,
  loadTicketAutomationSuccess,
  patchTicketAutomationSuccess,
  ticketBoardAutomationUpsert,
  unapproveTicketAutomationSuccess,
} from '../ticket-automation/ticket-automation.actions';
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
  prependTicketDetailActivity,
  replaceTicketDetailActivity,
  ticketBoardActivityCreated,
  ticketBoardCommentCreated,
  ticketBoardTicketRemoved,
  ticketBoardTicketUpsert,
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
/** Keep `TicketResponseDto.automationEligible` in sync when automation config is loaded or patched (activity is refreshed separately). */
function syncTicketAutomationEligible(state: TicketsState, ticketId: string, eligible: boolean): TicketsState {
  const list = state.list.map((t) => (t.id === ticketId ? { ...t, automationEligible: eligible } : t));
  const detail = state.detail;
  if (!detail) {
    return { ...state, list };
  }
  if (detail.id === ticketId) {
    return { ...state, list, detail: { ...detail, automationEligible: eligible } };
  }
  const children = detail.children;
  if (children?.length) {
    const idx = children.findIndex((c) => c.id === ticketId);
    if (idx >= 0) {
      const nextChildren = [...children];
      nextChildren[idx] = { ...nextChildren[idx], automationEligible: eligible };
      return { ...state, list, detail: { ...detail, children: nextChildren } };
    }
  }
  return { ...state, list, detail };
}

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
  on(prependTicketDetailActivity, (state, { activity }) => {
    if (state.selectedTicketId !== activity.ticketId) {
      return state;
    }
    if (state.activity.some((a) => a.id === activity.id)) {
      return state;
    }
    return { ...state, activity: [activity, ...state.activity] };
  }),
  on(replaceTicketDetailActivity, (state, { ticketId, activity }) =>
    state.selectedTicketId === ticketId ? { ...state, activity } : state,
  ),
  on(
    patchTicketAutomationSuccess,
    approveTicketAutomationSuccess,
    unapproveTicketAutomationSuccess,
    loadTicketAutomationSuccess,
    ticketBoardAutomationUpsert,
    (state, { config }) => syncTicketAutomationEligible(state, config.ticketId, config.eligible),
  ),
  on(ticketBoardTicketUpsert, (state, { ticket }) => {
    const detail =
      state.detail?.id === ticket.id
        ? {
            ...state.detail,
            ...ticket,
            children: ticket.children ?? state.detail.children,
          }
        : (mergeCreatedChildIntoDetail(state.detail, ticket) ?? state.detail);
    return {
      ...state,
      list: mergeTicketInList(state.list, ticket),
      detail,
    };
  }),
  on(ticketBoardTicketRemoved, (state, { id }) => ({
    ...state,
    list: state.list.filter((t) => t.id !== id),
    selectedTicketId: state.selectedTicketId === id ? null : state.selectedTicketId,
    detail: state.detail?.id === id ? null : state.detail,
  })),
  on(ticketBoardCommentCreated, (state, { comment }) => {
    if (state.selectedTicketId !== comment.ticketId) {
      return state;
    }
    if (state.comments.some((c) => c.id === comment.id)) {
      return state;
    }
    return { ...state, comments: [...state.comments, comment] };
  }),
  on(ticketBoardActivityCreated, (state, { activity }) => {
    if (state.selectedTicketId !== activity.ticketId) {
      return state;
    }
    if (state.activity.some((a) => a.id === activity.id)) {
      return state;
    }
    return { ...state, activity: [activity, ...state.activity] };
  }),
);
