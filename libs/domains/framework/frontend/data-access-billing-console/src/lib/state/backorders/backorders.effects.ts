import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { BackordersService } from '../../services/backorders.service';
import {
  loadBackorders,
  loadBackordersSuccess,
  loadBackordersFailure,
  retryBackorder,
  retryBackorderSuccess,
  retryBackorderFailure,
  cancelBackorder,
  cancelBackorderSuccess,
  cancelBackorderFailure,
} from './backorders.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const loadBackorders$ = createEffect(
  (actions$ = inject(Actions), backordersService = inject(BackordersService)) => {
    return actions$.pipe(
      ofType(loadBackorders),
      switchMap(() =>
        backordersService.listBackorders().pipe(
          map((backorders) => loadBackordersSuccess({ backorders })),
          catchError((error) => of(loadBackordersFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const retryBackorder$ = createEffect(
  (actions$ = inject(Actions), backordersService = inject(BackordersService)) => {
    return actions$.pipe(
      ofType(retryBackorder),
      switchMap(({ id, dto }) =>
        backordersService.retryBackorder(id, dto).pipe(
          map((backorder) => retryBackorderSuccess({ backorder })),
          catchError((error) => of(retryBackorderFailure({ id, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const cancelBackorder$ = createEffect(
  (actions$ = inject(Actions), backordersService = inject(BackordersService)) => {
    return actions$.pipe(
      ofType(cancelBackorder),
      switchMap(({ id, dto }) =>
        backordersService.cancelBackorder(id, dto).pipe(
          map((backorder) => cancelBackorderSuccess({ backorder })),
          catchError((error) => of(cancelBackorderFailure({ id, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
