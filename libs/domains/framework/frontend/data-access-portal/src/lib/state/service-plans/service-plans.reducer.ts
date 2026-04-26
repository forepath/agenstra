import { createReducer, on } from '@ngrx/store';

import type { PublicServicePlanOffering } from '../../types/portal-service-plans.types';

import {
  loadCheapestServicePlanOffering,
  loadCheapestServicePlanOfferingFailure,
  loadCheapestServicePlanOfferingSuccess,
  loadServicePlans,
  loadServicePlansBatch,
  loadServicePlansFailure,
  loadServicePlansSuccess,
} from './service-plans.actions';

export interface ServicePlansState {
  entities: PublicServicePlanOffering[];
  cheapestOffering: PublicServicePlanOffering | null;
  loading: boolean;
  loadingCheapest: boolean;
  error: string | null;
}

export const initialServicePlansState: ServicePlansState = {
  entities: [],
  cheapestOffering: null,
  loading: false,
  loadingCheapest: false,
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
  on(loadCheapestServicePlanOffering, (state) => ({
    ...state,
    loadingCheapest: true,
    error: null,
  })),
  on(loadCheapestServicePlanOfferingSuccess, (state, { offering }) => ({
    ...state,
    cheapestOffering: offering,
    loadingCheapest: false,
    error: null,
  })),
  on(loadCheapestServicePlanOfferingFailure, (state, { error }) => ({
    ...state,
    loadingCheapest: false,
    error,
  })),
);
