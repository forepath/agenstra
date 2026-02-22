import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { InvoicesService } from '../../services/invoices.service';
import {
  createInvoice,
  createInvoiceFailure,
  createInvoiceSuccess,
  loadInvoices,
  loadInvoicesFailure,
  loadInvoicesSuccess,
} from './invoices.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const loadInvoices$ = createEffect(
  (actions$ = inject(Actions), invoicesService = inject(InvoicesService)) => {
    return actions$.pipe(
      ofType(loadInvoices),
      switchMap(({ subscriptionId }) =>
        invoicesService.listInvoices(subscriptionId).pipe(
          map((invoices) => loadInvoicesSuccess({ subscriptionId, invoices })),
          catchError((error) => of(loadInvoicesFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createInvoice$ = createEffect(
  (actions$ = inject(Actions), invoicesService = inject(InvoicesService)) => {
    return actions$.pipe(
      ofType(createInvoice),
      switchMap(({ subscriptionId, dto }) =>
        invoicesService.createInvoice(subscriptionId, dto).pipe(
          map((response) => createInvoiceSuccess({ subscriptionId, response })),
          catchError((error) => of(createInvoiceFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
