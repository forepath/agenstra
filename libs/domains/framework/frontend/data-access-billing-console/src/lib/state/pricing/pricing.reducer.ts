import { createReducer, on } from '@ngrx/store';
import { previewPricing, previewPricingSuccess, previewPricingFailure, clearPricing } from './pricing.actions';
import type { PricingPreviewResponseDto } from './pricing.types';

export interface PricingState {
  preview: PricingPreviewResponseDto | null;
  loading: boolean;
  error: string | null;
}

export const initialPricingState: PricingState = {
  preview: null,
  loading: false,
  error: null,
};

export const pricingReducer = createReducer(
  initialPricingState,
  on(previewPricing, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(previewPricingSuccess, (state, { preview }) => ({
    ...state,
    preview,
    loading: false,
    error: null,
  })),
  on(previewPricingFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(clearPricing, (state) => ({
    ...state,
    preview: null,
    error: null,
  })),
);
