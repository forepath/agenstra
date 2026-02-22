import { createAction, props } from '@ngrx/store';
import type { CreateInvoiceDto, CreateInvoiceResponse, InvoiceResponse } from '../../types/billing.types';

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

// Clear Invoices Actions
export const clearInvoices = createAction('[Invoices] Clear Invoices');
