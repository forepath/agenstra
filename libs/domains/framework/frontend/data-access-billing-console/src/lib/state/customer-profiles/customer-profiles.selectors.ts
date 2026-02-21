import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { CustomerProfilesState } from './customer-profiles.reducer';

export const selectCustomerProfilesState = createFeatureSelector<CustomerProfilesState>('customerProfiles');

export const selectCustomerProfile = createSelector(selectCustomerProfilesState, (state) => state.profile);

export const selectCustomerProfileLoading = createSelector(selectCustomerProfilesState, (state) => state.loading);

export const selectCustomerProfileUpdating = createSelector(selectCustomerProfilesState, (state) => state.updating);

export const selectCustomerProfileError = createSelector(selectCustomerProfilesState, (state) => state.error);

export const selectHasCustomerProfile = createSelector(selectCustomerProfile, (profile) => profile !== null);
