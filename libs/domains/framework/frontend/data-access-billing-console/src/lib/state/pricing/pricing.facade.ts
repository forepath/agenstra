import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { PricingPreviewRequestDto, PricingPreviewResponseDto } from './pricing.types';
import { previewPricing, clearPricing } from './pricing.actions';
import {
  selectPricingPreview,
  selectPricingLoading,
  selectPricingError,
  selectHasPricingPreview,
} from './pricing.selectors';

@Injectable({ providedIn: 'root' })
export class PricingFacade {
  private readonly store = inject(Store);

  readonly preview$: Observable<PricingPreviewResponseDto | null> = this.store.select(selectPricingPreview);
  readonly loading$: Observable<boolean> = this.store.select(selectPricingLoading);
  readonly error$: Observable<string | null> = this.store.select(selectPricingError);
  readonly hasPreview$: Observable<boolean> = this.store.select(selectHasPricingPreview);

  previewPricing(dto: PricingPreviewRequestDto): void {
    this.store.dispatch(previewPricing({ dto }));
  }

  clearPricing(): void {
    this.store.dispatch(clearPricing());
  }
}
