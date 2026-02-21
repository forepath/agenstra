import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { SubscriptionsState } from './subscriptions.reducer';

export const selectSubscriptionsState = createFeatureSelector<SubscriptionsState>('subscriptions');

export const selectSubscriptions = createSelector(selectSubscriptionsState, (state) => state.entities);

export const selectSelectedSubscription = createSelector(
  selectSubscriptionsState,
  (state) => state.selectedSubscription,
);

export const selectSubscriptionsLoading = createSelector(selectSubscriptionsState, (state) => state.loading);

export const selectSubscriptionLoading = createSelector(selectSubscriptionsState, (state) => state.loadingSubscription);

export const selectSubscriptionsCreating = createSelector(selectSubscriptionsState, (state) => state.creating);

export const selectSubscriptionsCanceling = createSelector(selectSubscriptionsState, (state) => state.canceling);

export const selectSubscriptionsResuming = createSelector(selectSubscriptionsState, (state) => state.resuming);

export const selectSubscriptionsError = createSelector(selectSubscriptionsState, (state) => state.error);

export const selectSubscriptionsLoadingAny = createSelector(
  selectSubscriptionsLoading,
  selectSubscriptionLoading,
  selectSubscriptionsCreating,
  selectSubscriptionsCanceling,
  selectSubscriptionsResuming,
  (loading, loadingOne, creating, canceling, resuming) => loading || loadingOne || creating || canceling || resuming,
);

export const selectSubscriptionById = (id: string) =>
  createSelector(selectSubscriptions, (subscriptions) => subscriptions.find((s) => s.id === id) ?? null);

export const selectSubscriptionsCount = createSelector(selectSubscriptions, (subscriptions) => subscriptions.length);

export const selectHasSubscriptions = createSelector(selectSubscriptions, (subscriptions) => subscriptions.length > 0);

export const selectActiveSubscriptions = createSelector(selectSubscriptions, (subscriptions) =>
  subscriptions.filter((s) => s.status === 'active'),
);
