import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { PricingService } from '../../services/pricing.service';
import { previewPricing, previewPricingSuccess, previewPricingFailure } from './pricing.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'An unexpected error occurred';
}

export const previewPricing$ = createEffect(
  (actions$ = inject(Actions), pricingService = inject(PricingService)) => {
    return actions$.pipe(
      ofType(previewPricing),
      switchMap(({ dto }) =>
        pricingService.previewPricing(dto).pipe(
          map((preview) => previewPricingSuccess({ preview })),
          catchError((error) => of(previewPricingFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
