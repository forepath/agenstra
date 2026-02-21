import { createAction, props } from '@ngrx/store';
import type { PricingPreviewRequestDto, PricingPreviewResponseDto } from './pricing.types';

export const previewPricing = createAction('[Pricing] Preview Pricing', props<{ dto: PricingPreviewRequestDto }>());

export const previewPricingSuccess = createAction(
  '[Pricing] Preview Pricing Success',
  props<{ preview: PricingPreviewResponseDto }>(),
);

export const previewPricingFailure = createAction('[Pricing] Preview Pricing Failure', props<{ error: string }>());

export const clearPricing = createAction('[Pricing] Clear Pricing');
