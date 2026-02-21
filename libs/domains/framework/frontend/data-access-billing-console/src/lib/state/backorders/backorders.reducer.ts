import { createReducer, on } from '@ngrx/store';
import {
  loadBackorders,
  loadBackordersSuccess,
  loadBackordersFailure,
  retryBackorder,
  retryBackorderSuccess,
  retryBackorderFailure,
  cancelBackorder,
  cancelBackorderSuccess,
  cancelBackorderFailure,
} from './backorders.actions';
import type { BackorderResponseDto } from './backorders.types';

export interface BackordersState {
  entities: BackorderResponseDto[];
  loading: boolean;
  retrying: Record<string, boolean>;
  canceling: Record<string, boolean>;
  error: string | null;
}

export const initialBackordersState: BackordersState = {
  entities: [],
  loading: false,
  retrying: {},
  canceling: {},
  error: null,
};

export const backordersReducer = createReducer(
  initialBackordersState,
  on(loadBackorders, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadBackordersSuccess, (state, { backorders }) => ({
    ...state,
    entities: backorders,
    loading: false,
    error: null,
  })),
  on(loadBackordersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(retryBackorder, (state, { id }) => ({
    ...state,
    retrying: { ...state.retrying, [id]: true },
    error: null,
  })),
  on(retryBackorderSuccess, (state, { backorder }) => ({
    ...state,
    entities: state.entities.map((b) => (b.id === backorder.id ? backorder : b)),
    retrying: { ...state.retrying, [backorder.id]: false },
    error: null,
  })),
  on(retryBackorderFailure, (state, { id, error }) => ({
    ...state,
    retrying: { ...state.retrying, [id]: false },
    error,
  })),
  on(cancelBackorder, (state, { id }) => ({
    ...state,
    canceling: { ...state.canceling, [id]: true },
    error: null,
  })),
  on(cancelBackorderSuccess, (state, { backorder }) => ({
    ...state,
    entities: state.entities.map((b) => (b.id === backorder.id ? backorder : b)),
    canceling: { ...state.canceling, [backorder.id]: false },
    error: null,
  })),
  on(cancelBackorderFailure, (state, { id, error }) => ({
    ...state,
    canceling: { ...state.canceling, [id]: false },
    error,
  })),
);
