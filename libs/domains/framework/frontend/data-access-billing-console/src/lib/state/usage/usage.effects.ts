import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { UsageService } from '../../services/usage.service';
import {
  loadUsageSummary,
  loadUsageSummarySuccess,
  loadUsageSummaryFailure,
  recordUsage,
  recordUsageSuccess,
  recordUsageFailure,
} from './usage.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const loadUsageSummary$ = createEffect(
  (actions$ = inject(Actions), usageService = inject(UsageService)) => {
    return actions$.pipe(
      ofType(loadUsageSummary),
      switchMap(({ subscriptionId }) =>
        usageService.getUsageSummary(subscriptionId).pipe(
          map((summary) => loadUsageSummarySuccess({ subscriptionId, summary })),
          catchError((error) => of(loadUsageSummaryFailure({ subscriptionId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const recordUsage$ = createEffect(
  (actions$ = inject(Actions), usageService = inject(UsageService)) => {
    return actions$.pipe(
      ofType(recordUsage),
      switchMap(({ dto }) =>
        usageService.recordUsage(dto).pipe(
          map(() => recordUsageSuccess()),
          catchError((error) => of(recordUsageFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
