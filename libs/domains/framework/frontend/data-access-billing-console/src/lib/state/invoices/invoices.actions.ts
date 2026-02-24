import { createAction, props } from '@ngrx/store';
import type {
  CreateInvoiceDto,
  CreateInvoiceResponse,
  InvoiceResponse,
  InvoicesSummaryResponse,
} from '../../types/billing.types';

// Invoices Summary Actions
export const loadInvoicesSummary = createAction('[Invoices] Load Summary');
export const loadInvoicesSummarySuccess = createAction(
  '[Invoices] Load Summary Success',
  props<{ summary: InvoicesSummaryResponse }>(),
);
export const loadInvoicesSummaryFailure = createAction('[Invoices] Load Summary Failure', props<{ error: string }>());

// Open/Overdue List Actions
export const loadOpenOverdueInvoices = createAction('[Invoices] Load Open Overdue Invoices');
export const loadOpenOverdueInvoicesSuccess = createAction(
  '[Invoices] Load Open Overdue Invoices Success',
  props<{ invoices: InvoiceResponse[] }>(),
);
export const loadOpenOverdueInvoicesFailure = createAction(
  '[Invoices] Load Open Overdue Invoices Failure',
  props<{ error: string }>(),
);

// Load Invoices Actions
export const loadInvoices = createAction('[Invoices] Load Invoices', props<{ subscriptionId: string }>());

export const loadInvoicesSuccess = createAction(
  '[Invoices] Load Invoices Success',
  props<{ subscriptionId: string; invoices: InvoiceResponse[] }>(),
);

export const loadInvoicesFailure = createAction('[Invoices] Load Invoices Failure', props<{ error: string }>());

// Create Invoice Actions
export const createInvoice = createAction(
  '[Invoices] Create Invoice',
  props<{ subscriptionId: string; dto?: CreateInvoiceDto }>(),
);

export const createInvoiceSuccess = createAction(
  '[Invoices] Create Invoice Success',
  props<{ subscriptionId: string; response: CreateInvoiceResponse }>(),
);

export const createInvoiceFailure = createAction('[Invoices] Create Invoice Failure', props<{ error: string }>());

// Refresh Invoice Link Actions
export const refreshInvoiceLink = createAction(
  '[Invoices] Refresh Invoice Link',
  props<{ subscriptionId: string; invoiceRefId: string }>(),
);

export const refreshInvoiceLinkSuccess = createAction(
  '[Invoices] Refresh Invoice Link Success',
  props<{ subscriptionId: string; invoiceRefId: string; preAuthUrl: string }>(),
);

export const refreshInvoiceLinkFailure = createAction(
  '[Invoices] Refresh Invoice Link Failure',
  props<{ error: string }>(),
);

// Clear Invoices Actions
export const clearInvoices = createAction('[Invoices] Clear Invoices');
