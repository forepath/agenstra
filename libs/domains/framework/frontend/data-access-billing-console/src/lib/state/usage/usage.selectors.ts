import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { UsageState } from './usage.reducer';

export const selectUsageState = createFeatureSelector<UsageState>('usage');

export const selectUsageSummary = (subscriptionId: string) =>
  createSelector(selectUsageState, (state) => state.summaries[subscriptionId] ?? null);

export const selectUsageLoading = (subscriptionId: string) =>
  createSelector(selectUsageState, (state) => state.loading[subscriptionId] ?? false);

export const selectUsageRecording = (subscriptionId: string) =>
  createSelector(selectUsageState, (state) => state.recording[subscriptionId] ?? false);

export const selectUsageError = createSelector(selectUsageState, (state) => state.error);
