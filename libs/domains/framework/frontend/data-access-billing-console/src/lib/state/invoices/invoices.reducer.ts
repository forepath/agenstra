import { createReducer, on } from '@ngrx/store';
import {
  clearInvoices,
  createInvoice,
  createInvoiceFailure,
  createInvoiceSuccess,
  loadInvoices,
  loadInvoicesFailure,
  loadInvoicesSuccess,
  loadInvoicesSummary,
  loadInvoicesSummaryFailure,
  loadInvoicesSummarySuccess,
  loadOpenOverdueInvoices,
  loadOpenOverdueInvoicesFailure,
  loadOpenOverdueInvoicesSuccess,
  refreshInvoiceLink,
  refreshInvoiceLinkFailure,
  refreshInvoiceLinkSuccess,
} from './invoices.actions';
import type { InvoiceResponse, InvoicesSummaryResponse } from '../../types/billing.types';

export interface InvoicesState {
  entities: Record<string, InvoiceResponse[]>;
  loading: boolean;
  creating: boolean;
  refreshingInvoiceRefId: string | null;
  summary: InvoicesSummaryResponse | null;
  summaryLoading: boolean;
  summaryError: string | null;
  openOverdueList: InvoiceResponse[];
  openOverdueListLoading: boolean;
  openOverdueListError: string | null;
  error: string | null;
}

export const initialInvoicesState: InvoicesState = {
  entities: {},
  loading: false,
  creating: false,
  refreshingInvoiceRefId: null,
  summary: null,
  summaryLoading: false,
  summaryError: null,
  openOverdueList: [],
  openOverdueListLoading: false,
  openOverdueListError: null,
  error: null,
};

export const invoicesReducer = createReducer(
  initialInvoicesState,
  on(loadInvoicesSummary, (state) => ({
    ...state,
    summaryLoading: true,
    summaryError: null,
  })),
  on(loadInvoicesSummarySuccess, (state, { summary }) => ({
    ...state,
    summary,
    summaryLoading: false,
    summaryError: null,
  })),
  on(loadInvoicesSummaryFailure, (state, { error }) => ({
    ...state,
    summaryLoading: false,
    summaryError: error,
  })),
  on(loadOpenOverdueInvoices, (state) => ({
    ...state,
    openOverdueListLoading: true,
    openOverdueListError: null,
  })),
  on(loadOpenOverdueInvoicesSuccess, (state, { invoices }) => ({
    ...state,
    openOverdueList: invoices,
    openOverdueListLoading: false,
    openOverdueListError: null,
  })),
  on(loadOpenOverdueInvoicesFailure, (state, { error }) => ({
    ...state,
    openOverdueListLoading: false,
    openOverdueListError: error,
  })),
  on(loadInvoices, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadInvoicesSuccess, (state, { subscriptionId, invoices }) => ({
    ...state,
    entities: { ...state.entities, [subscriptionId]: invoices },
    loading: false,
    error: null,
  })),
  on(loadInvoicesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(createInvoice, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(createInvoiceSuccess, (state) => ({
    ...state,
    creating: false,
    error: null,
  })),
  on(createInvoiceFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
  on(refreshInvoiceLink, (state, { invoiceRefId }) => ({
    ...state,
    refreshingInvoiceRefId: invoiceRefId,
    error: null,
  })),
  on(refreshInvoiceLinkSuccess, (state, { subscriptionId, invoiceRefId, preAuthUrl }) => {
    const list = state.entities[subscriptionId] ?? [];
    const entities = {
      ...state.entities,
      [subscriptionId]: list.map((inv) => (inv.id === invoiceRefId ? { ...inv, preAuthUrl } : inv)),
    };
    const openOverdueList = state.openOverdueList.map((inv) =>
      inv.id === invoiceRefId ? { ...inv, preAuthUrl } : inv,
    );
    return {
      ...state,
      entities,
      openOverdueList,
      refreshingInvoiceRefId: null,
      error: null,
    };
  }),
  on(refreshInvoiceLinkFailure, (state, { error }) => ({
    ...state,
    refreshingInvoiceRefId: null,
    error,
  })),
  on(clearInvoices, () => initialInvoicesState),
);
