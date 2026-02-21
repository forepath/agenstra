import { createAction, props } from '@ngrx/store';
import type { CustomerProfileResponseDto, CustomerProfileDto } from './customer-profiles.types';

export const loadCustomerProfile = createAction('[Customer Profiles] Load Customer Profile');

export const loadCustomerProfileSuccess = createAction(
  '[Customer Profiles] Load Customer Profile Success',
  props<{ profile: CustomerProfileResponseDto }>(),
);

export const loadCustomerProfileFailure = createAction(
  '[Customer Profiles] Load Customer Profile Failure',
  props<{ error: string }>(),
);

export const createOrUpdateCustomerProfile = createAction(
  '[Customer Profiles] Create Or Update Customer Profile',
  props<{ dto: CustomerProfileDto }>(),
);

export const createOrUpdateCustomerProfileSuccess = createAction(
  '[Customer Profiles] Create Or Update Customer Profile Success',
  props<{ profile: CustomerProfileResponseDto }>(),
);

export const createOrUpdateCustomerProfileFailure = createAction(
  '[Customer Profiles] Create Or Update Customer Profile Failure',
  props<{ error: string }>(),
);
