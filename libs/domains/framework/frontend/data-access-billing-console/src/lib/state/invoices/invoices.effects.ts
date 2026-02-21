import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { InvoicesService } from '../../services/invoices.service';
import {
  loadInvoices,
  loadInvoicesSuccess,
  loadInvoicesFailure,
  createInvoice,
  createInvoiceSuccess,
  createInvoiceFailure,
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
          catchError((error) => of(loadInvoicesFailure({ subscriptionId, error: normalizeError(error) }))),
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
          map((invoice) => createInvoiceSuccess({ subscriptionId, invoice })),
          catchError((error) => of(createInvoiceFailure({ subscriptionId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
