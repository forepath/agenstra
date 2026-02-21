import { createReducer, on } from '@ngrx/store';
import {
  loadSubscriptions,
  loadSubscriptionsSuccess,
  loadSubscriptionsFailure,
  loadSubscription,
  loadSubscriptionSuccess,
  loadSubscriptionFailure,
  createSubscription,
  createSubscriptionSuccess,
  createSubscriptionFailure,
  cancelSubscription,
  cancelSubscriptionSuccess,
  cancelSubscriptionFailure,
  resumeSubscription,
  resumeSubscriptionSuccess,
  resumeSubscriptionFailure,
} from './subscriptions.actions';
import type { SubscriptionResponseDto } from './subscriptions.types';

export interface SubscriptionsState {
  entities: SubscriptionResponseDto[];
  selectedSubscription: SubscriptionResponseDto | null;
  loading: boolean;
  loadingSubscription: boolean;
  creating: boolean;
  canceling: boolean;
  resuming: boolean;
  error: string | null;
}

export const initialSubscriptionsState: SubscriptionsState = {
  entities: [],
  selectedSubscription: null,
  loading: false,
  loadingSubscription: false,
  creating: false,
  canceling: false,
  resuming: false,
  error: null,
};

export const subscriptionsReducer = createReducer(
  initialSubscriptionsState,
  on(loadSubscriptions, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadSubscriptionsSuccess, (state, { subscriptions }) => ({
    ...state,
    entities: subscriptions,
    loading: false,
    error: null,
  })),
  on(loadSubscriptionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(loadSubscription, (state) => ({
    ...state,
    loadingSubscription: true,
    error: null,
  })),
  on(loadSubscriptionSuccess, (state, { subscription }) => {
    const existingIndex = state.entities.findIndex((s) => s.id === subscription.id);
    const entities =
      existingIndex >= 0
        ? state.entities.map((s) => (s.id === subscription.id ? subscription : s))
        : [...state.entities, subscription];
    return {
      ...state,
      entities,
      selectedSubscription: subscription,
      loadingSubscription: false,
      error: null,
    };
  }),
  on(loadSubscriptionFailure, (state, { error }) => ({
    ...state,
    loadingSubscription: false,
    error,
  })),
  on(createSubscription, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(createSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: [...state.entities, subscription],
    selectedSubscription: subscription,
    creating: false,
    error: null,
  })),
  on(createSubscriptionFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
  on(cancelSubscription, (state) => ({
    ...state,
    canceling: true,
    error: null,
  })),
  on(cancelSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: state.entities.map((s) => (s.id === subscription.id ? subscription : s)),
    selectedSubscription:
      state.selectedSubscription?.id === subscription.id ? subscription : state.selectedSubscription,
    canceling: false,
    error: null,
  })),
  on(cancelSubscriptionFailure, (state, { error }) => ({
    ...state,
    canceling: false,
    error,
  })),
  on(resumeSubscription, (state) => ({
    ...state,
    resuming: true,
    error: null,
  })),
  on(resumeSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: state.entities.map((s) => (s.id === subscription.id ? subscription : s)),
    selectedSubscription:
      state.selectedSubscription?.id === subscription.id ? subscription : state.selectedSubscription,
    resuming: false,
    error: null,
  })),
  on(resumeSubscriptionFailure, (state, { error }) => ({
    ...state,
    resuming: false,
    error,
  })),
);
