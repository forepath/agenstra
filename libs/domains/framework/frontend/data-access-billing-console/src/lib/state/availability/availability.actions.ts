import { createAction, props } from '@ngrx/store';
import type { AvailabilityCheckDto, AvailabilityResponseDto, AlternativeConfigDto } from './availability.types';

export const checkAvailability = createAction(
  '[Availability] Check Availability',
  props<{ dto: AvailabilityCheckDto }>(),
);

export const checkAvailabilitySuccess = createAction(
  '[Availability] Check Availability Success',
  props<{ result: AvailabilityResponseDto }>(),
);

export const checkAvailabilityFailure = createAction(
  '[Availability] Check Availability Failure',
  props<{ error: string }>(),
);

export const getAlternatives = createAction('[Availability] Get Alternatives', props<{ dto: AvailabilityCheckDto }>());

export const getAlternativesSuccess = createAction(
  '[Availability] Get Alternatives Success',
  props<{ alternatives: AlternativeConfigDto[] }>(),
);

export const getAlternativesFailure = createAction(
  '[Availability] Get Alternatives Failure',
  props<{ error: string }>(),
);

export const clearAvailability = createAction('[Availability] Clear Availability');
