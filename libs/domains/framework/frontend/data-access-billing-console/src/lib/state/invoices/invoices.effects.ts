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
  loadInvoicesSummary,
  loadInvoicesSummaryFailure,
  loadInvoicesSummarySuccess,
  loadOpenOverdueInvoices,
  loadOpenOverdueInvoicesFailure,
  loadOpenOverdueInvoicesSuccess,
} from './invoices.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const loadInvoicesSummary$ = createEffect(
  (actions$ = inject(Actions), invoicesService = inject(InvoicesService)) => {
    return actions$.pipe(
      ofType(loadInvoicesSummary),
      switchMap(() =>
        invoicesService.getInvoicesSummary().pipe(
          map((summary) => loadInvoicesSummarySuccess({ summary })),
          catchError((error) => of(loadInvoicesSummaryFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const loadOpenOverdueInvoices$ = createEffect(
  (actions$ = inject(Actions), invoicesService = inject(InvoicesService)) => {
    return actions$.pipe(
      ofType(loadOpenOverdueInvoices),
      switchMap(() =>
        invoicesService.getOpenOverdueInvoices().pipe(
          map((invoices) => loadOpenOverdueInvoicesSuccess({ invoices })),
          catchError((error) => of(loadOpenOverdueInvoicesFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

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
