import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { CustomerProfilesService } from '../../services/customer-profiles.service';
import {
  loadCustomerProfile,
  loadCustomerProfileSuccess,
  loadCustomerProfileFailure,
  createOrUpdateCustomerProfile,
  createOrUpdateCustomerProfileSuccess,
  createOrUpdateCustomerProfileFailure,
} from './customer-profiles.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const loadCustomerProfile$ = createEffect(
  (actions$ = inject(Actions), customerProfilesService = inject(CustomerProfilesService)) => {
    return actions$.pipe(
      ofType(loadCustomerProfile),
      switchMap(() =>
        customerProfilesService.getCustomerProfile().pipe(
          map((profile) => loadCustomerProfileSuccess({ profile })),
          catchError((error) => of(loadCustomerProfileFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createOrUpdateCustomerProfile$ = createEffect(
  (actions$ = inject(Actions), customerProfilesService = inject(CustomerProfilesService)) => {
    return actions$.pipe(
      ofType(createOrUpdateCustomerProfile),
      switchMap(({ dto }) =>
        customerProfilesService.createOrUpdateCustomerProfile(dto).pipe(
          map((profile) => createOrUpdateCustomerProfileSuccess({ profile })),
          catchError((error) => of(createOrUpdateCustomerProfileFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
