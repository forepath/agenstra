import { createReducer, on } from '@ngrx/store';
import {
  clearInvoices,
  createInvoice,
  createInvoiceFailure,
  createInvoiceSuccess,
  loadInvoices,
  loadInvoicesFailure,
  loadInvoicesSuccess,
} from './invoices.actions';
import type { InvoiceResponse } from '../../types/billing.types';

export interface InvoicesState {
  entities: Record<string, InvoiceResponse[]>;
  loading: boolean;
  creating: boolean;
  error: string | null;
}

export const initialInvoicesState: InvoicesState = {
  entities: {},
  loading: false,
  creating: false,
  error: null,
};

export const invoicesReducer = createReducer(
  initialInvoicesState,
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
  on(clearInvoices, () => initialInvoicesState),
);
