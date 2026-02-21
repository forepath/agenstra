import { createReducer, on } from '@ngrx/store';
import {
  loadServicePlans,
  loadServicePlansSuccess,
  loadServicePlansFailure,
  loadServicePlansBatch,
  loadServicePlan,
  loadServicePlanSuccess,
  loadServicePlanFailure,
  createServicePlan,
  createServicePlanSuccess,
  createServicePlanFailure,
  updateServicePlan,
  updateServicePlanSuccess,
  updateServicePlanFailure,
  deleteServicePlan,
  deleteServicePlanSuccess,
  deleteServicePlanFailure,
} from './service-plans.actions';
import type { ServicePlanResponseDto } from './service-plans.types';

export interface ServicePlansState {
  entities: ServicePlanResponseDto[];
  selectedServicePlan: ServicePlanResponseDto | null;
  loading: boolean;
  loadingServicePlan: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
}

export const initialServicePlansState: ServicePlansState = {
  entities: [],
  selectedServicePlan: null,
  loading: false,
  loadingServicePlan: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
};

export const servicePlansReducer = createReducer(
  initialServicePlansState,
  on(loadServicePlans, (state) => ({
    ...state,
    entities: [],
    loading: true,
    error: null,
  })),
  on(loadServicePlansBatch, (state, { accumulatedServicePlans }) => ({
    ...state,
    entities: accumulatedServicePlans,
    loading: true,
    error: null,
  })),
  on(loadServicePlansSuccess, (state, { servicePlans }) => ({
    ...state,
    entities: servicePlans,
    loading: false,
    error: null,
  })),
  on(loadServicePlansFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(loadServicePlan, (state) => ({
    ...state,
    loadingServicePlan: true,
    error: null,
  })),
  on(loadServicePlanSuccess, (state, { servicePlan }) => {
    const existingIndex = state.entities.findIndex((sp) => sp.id === servicePlan.id);
    const entities =
      existingIndex >= 0
        ? state.entities.map((sp) => (sp.id === servicePlan.id ? servicePlan : sp))
        : [...state.entities, servicePlan];
    return {
      ...state,
      entities,
      selectedServicePlan: servicePlan,
      loadingServicePlan: false,
      error: null,
    };
  }),
  on(loadServicePlanFailure, (state, { error }) => ({
    ...state,
    loadingServicePlan: false,
    error,
  })),
  on(createServicePlan, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(createServicePlanSuccess, (state, { servicePlan }) => ({
    ...state,
    entities: [...state.entities, servicePlan],
    selectedServicePlan: servicePlan,
    creating: false,
    error: null,
  })),
  on(createServicePlanFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
  on(updateServicePlan, (state) => ({
    ...state,
    updating: true,
    error: null,
  })),
  on(updateServicePlanSuccess, (state, { servicePlan }) => ({
    ...state,
    entities: state.entities.map((sp) => (sp.id === servicePlan.id ? servicePlan : sp)),
    selectedServicePlan: state.selectedServicePlan?.id === servicePlan.id ? servicePlan : state.selectedServicePlan,
    updating: false,
    error: null,
  })),
  on(updateServicePlanFailure, (state, { error }) => ({
    ...state,
    updating: false,
    error,
  })),
  on(deleteServicePlan, (state) => ({
    ...state,
    deleting: true,
    error: null,
  })),
  on(deleteServicePlanSuccess, (state, { id }) => ({
    ...state,
    entities: state.entities.filter((sp) => sp.id !== id),
    selectedServicePlan: state.selectedServicePlan?.id === id ? null : state.selectedServicePlan,
    deleting: false,
    error: null,
  })),
  on(deleteServicePlanFailure, (state, { error }) => ({
    ...state,
    deleting: false,
    error,
  })),
);
