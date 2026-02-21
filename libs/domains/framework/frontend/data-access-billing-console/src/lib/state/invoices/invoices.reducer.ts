import { createReducer, on } from '@ngrx/store';
import {
  loadInvoices,
  loadInvoicesSuccess,
  loadInvoicesFailure,
  createInvoice,
  createInvoiceSuccess,
  createInvoiceFailure,
} from './invoices.actions';
import type { InvoiceResponseDto } from './invoices.types';

export interface InvoicesState {
  entities: Record<string, InvoiceResponseDto[]>;
  loading: Record<string, boolean>;
  creating: Record<string, boolean>;
  error: string | null;
}

export const initialInvoicesState: InvoicesState = {
  entities: {},
  loading: {},
  creating: {},
  error: null,
};

export const invoicesReducer = createReducer(
  initialInvoicesState,
  on(loadInvoices, (state, { subscriptionId }) => ({
    ...state,
    loading: { ...state.loading, [subscriptionId]: true },
    error: null,
  })),
  on(loadInvoicesSuccess, (state, { subscriptionId, invoices }) => ({
    ...state,
    entities: { ...state.entities, [subscriptionId]: invoices },
    loading: { ...state.loading, [subscriptionId]: false },
    error: null,
  })),
  on(loadInvoicesFailure, (state, { subscriptionId, error }) => ({
    ...state,
    loading: { ...state.loading, [subscriptionId]: false },
    error,
  })),
  on(createInvoice, (state, { subscriptionId }) => ({
    ...state,
    creating: { ...state.creating, [subscriptionId]: true },
    error: null,
  })),
  on(createInvoiceSuccess, (state, { subscriptionId, invoice }) => {
    const existingInvoices = state.entities[subscriptionId] ?? [];
    return {
      ...state,
      entities: { ...state.entities, [subscriptionId]: [...existingInvoices, invoice] },
      creating: { ...state.creating, [subscriptionId]: false },
      error: null,
    };
  }),
  on(createInvoiceFailure, (state, { subscriptionId, error }) => ({
    ...state,
    creating: { ...state.creating, [subscriptionId]: false },
    error,
  })),
);
