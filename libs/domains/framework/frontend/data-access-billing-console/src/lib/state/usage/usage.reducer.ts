import { createReducer, on } from '@ngrx/store';
import {
  loadUsageSummary,
  loadUsageSummarySuccess,
  loadUsageSummaryFailure,
  recordUsage,
  recordUsageSuccess,
  recordUsageFailure,
} from './usage.actions';
import type { UsageSummaryDto } from './usage.types';

export interface UsageState {
  summaries: Record<string, UsageSummaryDto>;
  loading: Record<string, boolean>;
  recording: Record<string, boolean>;
  error: string | null;
}

export const initialUsageState: UsageState = {
  summaries: {},
  loading: {},
  recording: {},
  error: null,
};

export const usageReducer = createReducer(
  initialUsageState,
  on(loadUsageSummary, (state, { subscriptionId }) => ({
    ...state,
    loading: { ...state.loading, [subscriptionId]: true },
    error: null,
  })),
  on(loadUsageSummarySuccess, (state, { subscriptionId, summary }) => ({
    ...state,
    summaries: { ...state.summaries, [subscriptionId]: summary },
    loading: { ...state.loading, [subscriptionId]: false },
    error: null,
  })),
  on(loadUsageSummaryFailure, (state, { subscriptionId, error }) => ({
    ...state,
    loading: { ...state.loading, [subscriptionId]: false },
    error,
  })),
  on(recordUsage, (state, { dto }) => ({
    ...state,
    recording: { ...state.recording, [dto.subscriptionId]: true },
    error: null,
  })),
  on(recordUsageSuccess, (state) => ({
    ...state,
    recording: Object.keys(state.recording).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
    error: null,
  })),
  on(recordUsageFailure, (state, { error }) => ({
    ...state,
    recording: Object.keys(state.recording).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
    error,
  })),
);
