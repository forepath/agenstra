import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { BackordersState } from './backorders.reducer';

export const selectBackordersState = createFeatureSelector<BackordersState>('backorders');

export const selectBackorders = createSelector(selectBackordersState, (state) => state.entities);

export const selectBackordersLoading = createSelector(selectBackordersState, (state) => state.loading);

export const selectBackordersRetrying = (id: string) =>
  createSelector(selectBackordersState, (state) => state.retrying[id] ?? false);

export const selectBackordersCanceling = (id: string) =>
  createSelector(selectBackordersState, (state) => state.canceling[id] ?? false);

export const selectBackordersError = createSelector(selectBackordersState, (state) => state.error);

export const selectBackorderById = (id: string) =>
  createSelector(selectBackorders, (backorders) => backorders.find((b) => b.id === id) ?? null);

export const selectBackordersCount = createSelector(selectBackorders, (backorders) => backorders.length);

export const selectHasBackorders = createSelector(selectBackorders, (backorders) => backorders.length > 0);

export const selectPendingBackorders = createSelector(selectBackorders, (backorders) =>
  backorders.filter((b) => b.status === 'pending'),
);
