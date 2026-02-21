import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { AvailabilityService } from '../../services/availability.service';
import {
  checkAvailability,
  checkAvailabilitySuccess,
  checkAvailabilityFailure,
  getAlternatives,
  getAlternativesSuccess,
  getAlternativesFailure,
} from './availability.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const checkAvailability$ = createEffect(
  (actions$ = inject(Actions), availabilityService = inject(AvailabilityService)) => {
    return actions$.pipe(
      ofType(checkAvailability),
      switchMap(({ dto }) =>
        availabilityService.checkAvailability(dto).pipe(
          map((result) => checkAvailabilitySuccess({ result })),
          catchError((error) => of(checkAvailabilityFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const getAlternatives$ = createEffect(
  (actions$ = inject(Actions), availabilityService = inject(AvailabilityService)) => {
    return actions$.pipe(
      ofType(getAlternatives),
      switchMap(({ dto }) =>
        availabilityService.getAlternatives(dto).pipe(
          map((alternatives) => getAlternativesSuccess({ alternatives })),
          catchError((error) => of(getAlternativesFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
