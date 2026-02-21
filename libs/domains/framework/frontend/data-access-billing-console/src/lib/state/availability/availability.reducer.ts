import { createReducer, on } from '@ngrx/store';
import {
  checkAvailability,
  checkAvailabilitySuccess,
  checkAvailabilityFailure,
  getAlternatives,
  getAlternativesSuccess,
  getAlternativesFailure,
  clearAvailability,
} from './availability.actions';
import type { AvailabilityResponseDto, AlternativeConfigDto } from './availability.types';

export interface AvailabilityState {
  lastCheck: AvailabilityResponseDto | null;
  alternatives: AlternativeConfigDto[];
  checking: boolean;
  loadingAlternatives: boolean;
  error: string | null;
}

export const initialAvailabilityState: AvailabilityState = {
  lastCheck: null,
  alternatives: [],
  checking: false,
  loadingAlternatives: false,
  error: null,
};

export const availabilityReducer = createReducer(
  initialAvailabilityState,
  on(checkAvailability, (state) => ({
    ...state,
    checking: true,
    error: null,
  })),
  on(checkAvailabilitySuccess, (state, { result }) => ({
    ...state,
    lastCheck: result,
    checking: false,
    error: null,
  })),
  on(checkAvailabilityFailure, (state, { error }) => ({
    ...state,
    checking: false,
    error,
  })),
  on(getAlternatives, (state) => ({
    ...state,
    loadingAlternatives: true,
    error: null,
  })),
  on(getAlternativesSuccess, (state, { alternatives }) => ({
    ...state,
    alternatives,
    loadingAlternatives: false,
    error: null,
  })),
  on(getAlternativesFailure, (state, { error }) => ({
    ...state,
    loadingAlternatives: false,
    error,
  })),
  on(clearAvailability, (state) => ({
    ...state,
    lastCheck: null,
    alternatives: [],
    error: null,
  })),
);
