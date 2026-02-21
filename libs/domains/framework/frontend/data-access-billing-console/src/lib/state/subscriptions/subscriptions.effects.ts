import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { SubscriptionsService } from '../../services/subscriptions.service';
import {
  loadSubscriptions,
  loadSubscriptionsSuccess,
  loadSubscriptionsFailure,
  loadSubscription,
  loadSubscriptionSuccess,
  loadSubscriptionFailure,
  createSubscription,
  createSubscriptionSuccess,
  createSubscriptionFailure,
  cancelSubscription,
  cancelSubscriptionSuccess,
  cancelSubscriptionFailure,
  resumeSubscription,
  resumeSubscriptionSuccess,
  resumeSubscriptionFailure,
} from './subscriptions.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const loadSubscriptions$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(loadSubscriptions),
      switchMap(() =>
        subscriptionsService.listSubscriptions().pipe(
          map((subscriptions) => loadSubscriptionsSuccess({ subscriptions })),
          catchError((error) => of(loadSubscriptionsFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const loadSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(loadSubscription),
      switchMap(({ id }) =>
        subscriptionsService.getSubscription(id).pipe(
          map((subscription) => loadSubscriptionSuccess({ subscription })),
          catchError((error) => of(loadSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(createSubscription),
      switchMap(({ dto }) =>
        subscriptionsService.createSubscription(dto).pipe(
          map((subscription) => createSubscriptionSuccess({ subscription })),
          catchError((error) => of(createSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const cancelSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(cancelSubscription),
      switchMap(({ id, dto }) =>
        subscriptionsService.cancelSubscription(id, dto).pipe(
          map((subscription) => cancelSubscriptionSuccess({ subscription })),
          catchError((error) => of(cancelSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const resumeSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(resumeSubscription),
      switchMap(({ id, dto }) =>
        subscriptionsService.resumeSubscription(id, dto).pipe(
          map((subscription) => resumeSubscriptionSuccess({ subscription })),
          catchError((error) => of(resumeSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
