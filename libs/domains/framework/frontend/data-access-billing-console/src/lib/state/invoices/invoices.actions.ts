import { createAction, props } from '@ngrx/store';
import type { InvoiceResponseDto, CreateInvoiceDto } from './invoices.types';

export const loadInvoices = createAction('[Invoices] Load Invoices', props<{ subscriptionId: string }>());

export const loadInvoicesSuccess = createAction(
  '[Invoices] Load Invoices Success',
  props<{ subscriptionId: string; invoices: InvoiceResponseDto[] }>(),
);

export const loadInvoicesFailure = createAction(
  '[Invoices] Load Invoices Failure',
  props<{ subscriptionId: string; error: string }>(),
);

export const createInvoice = createAction(
  '[Invoices] Create Invoice',
  props<{ subscriptionId: string; dto: CreateInvoiceDto }>(),
);

export const createInvoiceSuccess = createAction(
  '[Invoices] Create Invoice Success',
  props<{ subscriptionId: string; invoice: InvoiceResponseDto }>(),
);

export const createInvoiceFailure = createAction(
  '[Invoices] Create Invoice Failure',
  props<{ subscriptionId: string; error: string }>(),
);
