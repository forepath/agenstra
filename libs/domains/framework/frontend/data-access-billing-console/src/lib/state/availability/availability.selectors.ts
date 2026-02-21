import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { AvailabilityState } from './availability.reducer';

export const selectAvailabilityState = createFeatureSelector<AvailabilityState>('availability');

export const selectAvailabilityLastCheck = createSelector(selectAvailabilityState, (state) => state.lastCheck);

export const selectAvailabilityAlternatives = createSelector(selectAvailabilityState, (state) => state.alternatives);

export const selectAvailabilityChecking = createSelector(selectAvailabilityState, (state) => state.checking);

export const selectAvailabilityLoadingAlternatives = createSelector(
  selectAvailabilityState,
  (state) => state.loadingAlternatives,
);

export const selectAvailabilityError = createSelector(selectAvailabilityState, (state) => state.error);

export const selectIsAvailable = createSelector(
  selectAvailabilityLastCheck,
  (lastCheck) => lastCheck?.available ?? false,
);
