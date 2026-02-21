import { createReducer, on } from '@ngrx/store';
import {
  loadCustomerProfile,
  loadCustomerProfileSuccess,
  loadCustomerProfileFailure,
  createOrUpdateCustomerProfile,
  createOrUpdateCustomerProfileSuccess,
  createOrUpdateCustomerProfileFailure,
} from './customer-profiles.actions';
import type { CustomerProfileResponseDto } from './customer-profiles.types';

export interface CustomerProfilesState {
  profile: CustomerProfileResponseDto | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
}

export const initialCustomerProfilesState: CustomerProfilesState = {
  profile: null,
  loading: false,
  updating: false,
  error: null,
};

export const customerProfilesReducer = createReducer(
  initialCustomerProfilesState,
  on(loadCustomerProfile, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadCustomerProfileSuccess, (state, { profile }) => ({
    ...state,
    profile,
    loading: false,
    error: null,
  })),
  on(loadCustomerProfileFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(createOrUpdateCustomerProfile, (state) => ({
    ...state,
    updating: true,
    error: null,
  })),
  on(createOrUpdateCustomerProfileSuccess, (state, { profile }) => ({
    ...state,
    profile,
    updating: false,
    error: null,
  })),
  on(createOrUpdateCustomerProfileFailure, (state, { error }) => ({
    ...state,
    updating: false,
    error,
  })),
);
