import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { InvoicesState } from './invoices.reducer';

export const selectInvoicesState = createFeatureSelector<InvoicesState>('invoices');

export const selectInvoicesEntities = createSelector(selectInvoicesState, (state) => state.entities);

export const selectInvoicesLoading = createSelector(selectInvoicesState, (state) => state.loading);

export const selectInvoicesCreating = createSelector(selectInvoicesState, (state) => state.creating);

export const selectInvoicesError = createSelector(selectInvoicesState, (state) => state.error);

export const selectInvoicesLoadingAny = createSelector(
  selectInvoicesLoading,
  selectInvoicesCreating,
  (loading, creating) => loading || creating,
);

export const selectInvoicesBySubscriptionId = (subscriptionId: string) =>
  createSelector(selectInvoicesEntities, (entities) => entities[subscriptionId] ?? []);

export const selectInvoicesCountBySubscriptionId = (subscriptionId: string) =>
  createSelector(selectInvoicesBySubscriptionId(subscriptionId), (invoices) => invoices.length);

export const selectHasInvoicesBySubscriptionId = (subscriptionId: string) =>
  createSelector(selectInvoicesBySubscriptionId(subscriptionId), (invoices) => invoices.length > 0);
