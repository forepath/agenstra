import { createAction, props } from '@ngrx/store';
import type {
  ServiceTypeResponseDto,
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  ListServiceTypesParams,
} from './service-types.types';

export const loadServiceTypes = createAction(
  '[Service Types] Load Service Types',
  props<{ params?: ListServiceTypesParams }>(),
);

export const loadServiceTypesSuccess = createAction(
  '[Service Types] Load Service Types Success',
  props<{ serviceTypes: ServiceTypeResponseDto[] }>(),
);

export const loadServiceTypesFailure = createAction(
  '[Service Types] Load Service Types Failure',
  props<{ error: string }>(),
);

export const loadServiceTypesBatch = createAction(
  '[Service Types] Load Service Types Batch',
  props<{ offset: number; accumulatedServiceTypes: ServiceTypeResponseDto[] }>(),
);

export const loadServiceType = createAction('[Service Types] Load Service Type', props<{ id: string }>());

export const loadServiceTypeSuccess = createAction(
  '[Service Types] Load Service Type Success',
  props<{ serviceType: ServiceTypeResponseDto }>(),
);

export const loadServiceTypeFailure = createAction(
  '[Service Types] Load Service Type Failure',
  props<{ error: string }>(),
);

export const createServiceType = createAction(
  '[Service Types] Create Service Type',
  props<{ dto: CreateServiceTypeDto }>(),
);

export const createServiceTypeSuccess = createAction(
  '[Service Types] Create Service Type Success',
  props<{ serviceType: ServiceTypeResponseDto }>(),
);

export const createServiceTypeFailure = createAction(
  '[Service Types] Create Service Type Failure',
  props<{ error: string }>(),
);

export const updateServiceType = createAction(
  '[Service Types] Update Service Type',
  props<{ id: string; dto: UpdateServiceTypeDto }>(),
);

export const updateServiceTypeSuccess = createAction(
  '[Service Types] Update Service Type Success',
  props<{ serviceType: ServiceTypeResponseDto }>(),
);

export const updateServiceTypeFailure = createAction(
  '[Service Types] Update Service Type Failure',
  props<{ error: string }>(),
);

export const deleteServiceType = createAction('[Service Types] Delete Service Type', props<{ id: string }>());

export const deleteServiceTypeSuccess = createAction(
  '[Service Types] Delete Service Type Success',
  props<{ id: string }>(),
);

export const deleteServiceTypeFailure = createAction(
  '[Service Types] Delete Service Type Failure',
  props<{ error: string }>(),
);
