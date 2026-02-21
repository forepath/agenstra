import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { InvoicesState } from './invoices.reducer';

export const selectInvoicesState = createFeatureSelector<InvoicesState>('invoices');

export const selectInvoicesBySubscription = (subscriptionId: string) =>
  createSelector(selectInvoicesState, (state) => state.entities[subscriptionId] ?? []);

export const selectInvoicesLoading = (subscriptionId: string) =>
  createSelector(selectInvoicesState, (state) => state.loading[subscriptionId] ?? false);

export const selectInvoicesCreating = (subscriptionId: string) =>
  createSelector(selectInvoicesState, (state) => state.creating[subscriptionId] ?? false);

export const selectInvoicesError = createSelector(selectInvoicesState, (state) => state.error);
