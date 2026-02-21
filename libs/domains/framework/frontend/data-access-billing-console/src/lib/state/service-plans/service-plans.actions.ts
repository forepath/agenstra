import { createAction, props } from '@ngrx/store';
import type {
  ServicePlanResponseDto,
  CreateServicePlanDto,
  UpdateServicePlanDto,
  ListServicePlansParams,
} from './service-plans.types';

export const loadServicePlans = createAction(
  '[Service Plans] Load Service Plans',
  props<{ params?: ListServicePlansParams }>(),
);

export const loadServicePlansSuccess = createAction(
  '[Service Plans] Load Service Plans Success',
  props<{ servicePlans: ServicePlanResponseDto[] }>(),
);

export const loadServicePlansFailure = createAction(
  '[Service Plans] Load Service Plans Failure',
  props<{ error: string }>(),
);

export const loadServicePlansBatch = createAction(
  '[Service Plans] Load Service Plans Batch',
  props<{ offset: number; accumulatedServicePlans: ServicePlanResponseDto[] }>(),
);

export const loadServicePlan = createAction('[Service Plans] Load Service Plan', props<{ id: string }>());

export const loadServicePlanSuccess = createAction(
  '[Service Plans] Load Service Plan Success',
  props<{ servicePlan: ServicePlanResponseDto }>(),
);

export const loadServicePlanFailure = createAction(
  '[Service Plans] Load Service Plan Failure',
  props<{ error: string }>(),
);

export const createServicePlan = createAction(
  '[Service Plans] Create Service Plan',
  props<{ dto: CreateServicePlanDto }>(),
);

export const createServicePlanSuccess = createAction(
  '[Service Plans] Create Service Plan Success',
  props<{ servicePlan: ServicePlanResponseDto }>(),
);

export const createServicePlanFailure = createAction(
  '[Service Plans] Create Service Plan Failure',
  props<{ error: string }>(),
);

export const updateServicePlan = createAction(
  '[Service Plans] Update Service Plan',
  props<{ id: string; dto: UpdateServicePlanDto }>(),
);

export const updateServicePlanSuccess = createAction(
  '[Service Plans] Update Service Plan Success',
  props<{ servicePlan: ServicePlanResponseDto }>(),
);

export const updateServicePlanFailure = createAction(
  '[Service Plans] Update Service Plan Failure',
  props<{ error: string }>(),
);

export const deleteServicePlan = createAction('[Service Plans] Delete Service Plan', props<{ id: string }>());

export const deleteServicePlanSuccess = createAction(
  '[Service Plans] Delete Service Plan Success',
  props<{ id: string }>(),
);

export const deleteServicePlanFailure = createAction(
  '[Service Plans] Delete Service Plan Failure',
  props<{ error: string }>(),
);
