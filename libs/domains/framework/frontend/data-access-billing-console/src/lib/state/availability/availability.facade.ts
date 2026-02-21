import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { AvailabilityCheckDto, AvailabilityResponseDto, AlternativeConfigDto } from './availability.types';
import { checkAvailability, getAlternatives, clearAvailability } from './availability.actions';
import {
  selectAvailabilityLastCheck,
  selectAvailabilityAlternatives,
  selectAvailabilityChecking,
  selectAvailabilityLoadingAlternatives,
  selectAvailabilityError,
  selectIsAvailable,
} from './availability.selectors';

@Injectable({ providedIn: 'root' })
export class AvailabilityFacade {
  private readonly store = inject(Store);

  readonly lastCheck$: Observable<AvailabilityResponseDto | null> = this.store.select(selectAvailabilityLastCheck);
  readonly alternatives$: Observable<AlternativeConfigDto[]> = this.store.select(selectAvailabilityAlternatives);
  readonly checking$: Observable<boolean> = this.store.select(selectAvailabilityChecking);
  readonly loadingAlternatives$: Observable<boolean> = this.store.select(selectAvailabilityLoadingAlternatives);
  readonly error$: Observable<string | null> = this.store.select(selectAvailabilityError);
  readonly isAvailable$: Observable<boolean> = this.store.select(selectIsAvailable);

  checkAvailability(dto: AvailabilityCheckDto): void {
    this.store.dispatch(checkAvailability({ dto }));
  }

  getAlternatives(dto: AvailabilityCheckDto): void {
    this.store.dispatch(getAlternatives({ dto }));
  }

  clearAvailability(): void {
    this.store.dispatch(clearAvailability());
  }
}
