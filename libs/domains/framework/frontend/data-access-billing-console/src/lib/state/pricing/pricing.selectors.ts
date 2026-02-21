import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { PricingState } from './pricing.reducer';

export const selectPricingState = createFeatureSelector<PricingState>('pricing');

export const selectPricingPreview = createSelector(selectPricingState, (state) => state.preview);

export const selectPricingLoading = createSelector(selectPricingState, (state) => state.loading);

export const selectPricingError = createSelector(selectPricingState, (state) => state.error);

export const selectHasPricingPreview = createSelector(selectPricingPreview, (preview) => preview !== null);
