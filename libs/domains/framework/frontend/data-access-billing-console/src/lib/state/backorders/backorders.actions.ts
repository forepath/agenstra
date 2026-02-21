import { createAction, props } from '@ngrx/store';
import type { BackorderResponseDto, BackorderRetryDto, BackorderCancelDto } from './backorders.types';

export const loadBackorders = createAction('[Backorders] Load Backorders');

export const loadBackordersSuccess = createAction(
  '[Backorders] Load Backorders Success',
  props<{ backorders: BackorderResponseDto[] }>(),
);

export const loadBackordersFailure = createAction('[Backorders] Load Backorders Failure', props<{ error: string }>());

export const retryBackorder = createAction(
  '[Backorders] Retry Backorder',
  props<{ id: string; dto: BackorderRetryDto }>(),
);

export const retryBackorderSuccess = createAction(
  '[Backorders] Retry Backorder Success',
  props<{ backorder: BackorderResponseDto }>(),
);

export const retryBackorderFailure = createAction(
  '[Backorders] Retry Backorder Failure',
  props<{ id: string; error: string }>(),
);

export const cancelBackorder = createAction(
  '[Backorders] Cancel Backorder',
  props<{ id: string; dto: BackorderCancelDto }>(),
);

export const cancelBackorderSuccess = createAction(
  '[Backorders] Cancel Backorder Success',
  props<{ backorder: BackorderResponseDto }>(),
);

export const cancelBackorderFailure = createAction(
  '[Backorders] Cancel Backorder Failure',
  props<{ id: string; error: string }>(),
);
