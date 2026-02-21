import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { ServicePlansState } from './service-plans.reducer';

export const selectServicePlansState = createFeatureSelector<ServicePlansState>('servicePlans');

export const selectServicePlans = createSelector(selectServicePlansState, (state) => state.entities);

export const selectSelectedServicePlan = createSelector(selectServicePlansState, (state) => state.selectedServicePlan);

export const selectServicePlansLoading = createSelector(selectServicePlansState, (state) => state.loading);

export const selectServicePlanLoading = createSelector(selectServicePlansState, (state) => state.loadingServicePlan);

export const selectServicePlansCreating = createSelector(selectServicePlansState, (state) => state.creating);

export const selectServicePlansUpdating = createSelector(selectServicePlansState, (state) => state.updating);

export const selectServicePlansDeleting = createSelector(selectServicePlansState, (state) => state.deleting);

export const selectServicePlansError = createSelector(selectServicePlansState, (state) => state.error);

export const selectServicePlansLoadingAny = createSelector(
  selectServicePlansLoading,
  selectServicePlanLoading,
  selectServicePlansCreating,
  selectServicePlansUpdating,
  selectServicePlansDeleting,
  (loading, loadingOne, creating, updating, deleting) => loading || loadingOne || creating || updating || deleting,
);

export const selectServicePlanById = (id: string) =>
  createSelector(selectServicePlans, (servicePlans) => servicePlans.find((sp) => sp.id === id) ?? null);

export const selectServicePlansCount = createSelector(selectServicePlans, (servicePlans) => servicePlans.length);

export const selectHasServicePlans = createSelector(selectServicePlans, (servicePlans) => servicePlans.length > 0);

export const selectActiveServicePlans = createSelector(selectServicePlans, (servicePlans) =>
  servicePlans.filter((sp) => sp.isActive),
);

export const selectServicePlansByServiceTypeId = (serviceTypeId: string) =>
  createSelector(selectServicePlans, (servicePlans) => servicePlans.filter((sp) => sp.serviceTypeId === serviceTypeId));
