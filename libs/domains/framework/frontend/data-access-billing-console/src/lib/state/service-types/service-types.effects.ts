import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { ServiceTypesService } from '../../services/service-types.service';
import {
  loadServiceTypes,
  loadServiceTypesSuccess,
  loadServiceTypesFailure,
  loadServiceTypesBatch,
  loadServiceType,
  loadServiceTypeSuccess,
  loadServiceTypeFailure,
  createServiceType,
  createServiceTypeSuccess,
  createServiceTypeFailure,
  updateServiceType,
  updateServiceTypeSuccess,
  updateServiceTypeFailure,
  deleteServiceType,
  deleteServiceTypeSuccess,
  deleteServiceTypeFailure,
} from './service-types.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

const BATCH_SIZE = 10;

export const loadServiceTypes$ = createEffect(
  (actions$ = inject(Actions), serviceTypesService = inject(ServiceTypesService)) => {
    return actions$.pipe(
      ofType(loadServiceTypes),
      switchMap(() => {
        const batchParams = { limit: BATCH_SIZE, offset: 0 };
        return serviceTypesService.listServiceTypes(batchParams).pipe(
          switchMap((serviceTypes) => {
            if (serviceTypes.length === 0) return of(loadServiceTypesSuccess({ serviceTypes: [] }));
            if (serviceTypes.length < BATCH_SIZE) return of(loadServiceTypesSuccess({ serviceTypes }));
            return of(loadServiceTypesBatch({ offset: BATCH_SIZE, accumulatedServiceTypes: serviceTypes }));
          }),
          catchError((error) => of(loadServiceTypesFailure({ error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const loadServiceTypesBatch$ = createEffect(
  (actions$ = inject(Actions), serviceTypesService = inject(ServiceTypesService)) => {
    return actions$.pipe(
      ofType(loadServiceTypesBatch),
      switchMap(({ offset, accumulatedServiceTypes }) => {
        const batchParams = { limit: BATCH_SIZE, offset };
        return serviceTypesService.listServiceTypes(batchParams).pipe(
          switchMap((serviceTypes) => {
            const newAccumulated = [...accumulatedServiceTypes, ...serviceTypes];
            if (serviceTypes.length === 0) return of(loadServiceTypesSuccess({ serviceTypes: newAccumulated }));
            if (serviceTypes.length < BATCH_SIZE) return of(loadServiceTypesSuccess({ serviceTypes: newAccumulated }));
            return of(loadServiceTypesBatch({ offset: offset + BATCH_SIZE, accumulatedServiceTypes: newAccumulated }));
          }),
          catchError((error) => of(loadServiceTypesFailure({ error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const loadServiceType$ = createEffect(
  (actions$ = inject(Actions), serviceTypesService = inject(ServiceTypesService)) => {
    return actions$.pipe(
      ofType(loadServiceType),
      switchMap(({ id }) =>
        serviceTypesService.getServiceType(id).pipe(
          map((serviceType) => loadServiceTypeSuccess({ serviceType })),
          catchError((error) => of(loadServiceTypeFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createServiceType$ = createEffect(
  (actions$ = inject(Actions), serviceTypesService = inject(ServiceTypesService)) => {
    return actions$.pipe(
      ofType(createServiceType),
      switchMap(({ dto }) =>
        serviceTypesService.createServiceType(dto).pipe(
          map((serviceType) => createServiceTypeSuccess({ serviceType })),
          catchError((error) => of(createServiceTypeFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const updateServiceType$ = createEffect(
  (actions$ = inject(Actions), serviceTypesService = inject(ServiceTypesService)) => {
    return actions$.pipe(
      ofType(updateServiceType),
      switchMap(({ id, dto }) =>
        serviceTypesService.updateServiceType(id, dto).pipe(
          map((serviceType) => updateServiceTypeSuccess({ serviceType })),
          catchError((error) => of(updateServiceTypeFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const deleteServiceType$ = createEffect(
  (actions$ = inject(Actions), serviceTypesService = inject(ServiceTypesService)) => {
    return actions$.pipe(
      ofType(deleteServiceType),
      switchMap(({ id }) =>
        serviceTypesService.deleteServiceType(id).pipe(
          map(() => deleteServiceTypeSuccess({ id })),
          catchError((error) => of(deleteServiceTypeFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
