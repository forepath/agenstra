import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { ServiceTypesState } from './service-types.reducer';

export const selectServiceTypesState = createFeatureSelector<ServiceTypesState>('serviceTypes');

export const selectServiceTypes = createSelector(selectServiceTypesState, (state) => state.entities);

export const selectSelectedServiceType = createSelector(selectServiceTypesState, (state) => state.selectedServiceType);

export const selectServiceTypesLoading = createSelector(selectServiceTypesState, (state) => state.loading);

export const selectServiceTypeLoading = createSelector(selectServiceTypesState, (state) => state.loadingServiceType);

export const selectServiceTypesCreating = createSelector(selectServiceTypesState, (state) => state.creating);

export const selectServiceTypesUpdating = createSelector(selectServiceTypesState, (state) => state.updating);

export const selectServiceTypesDeleting = createSelector(selectServiceTypesState, (state) => state.deleting);

export const selectServiceTypesError = createSelector(selectServiceTypesState, (state) => state.error);

export const selectServiceTypesLoadingAny = createSelector(
  selectServiceTypesLoading,
  selectServiceTypeLoading,
  selectServiceTypesCreating,
  selectServiceTypesUpdating,
  selectServiceTypesDeleting,
  (loading, loadingOne, creating, updating, deleting) => loading || loadingOne || creating || updating || deleting,
);

export const selectServiceTypeById = (id: string) =>
  createSelector(selectServiceTypes, (serviceTypes) => serviceTypes.find((st) => st.id === id) ?? null);

export const selectServiceTypesCount = createSelector(selectServiceTypes, (serviceTypes) => serviceTypes.length);

export const selectHasServiceTypes = createSelector(selectServiceTypes, (serviceTypes) => serviceTypes.length > 0);

export const selectActiveServiceTypes = createSelector(selectServiceTypes, (serviceTypes) =>
  serviceTypes.filter((st) => st.isActive),
);
