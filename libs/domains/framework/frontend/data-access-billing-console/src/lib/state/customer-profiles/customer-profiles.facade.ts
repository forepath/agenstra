import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { CustomerProfileResponseDto, CustomerProfileDto } from './customer-profiles.types';
import { loadCustomerProfile, createOrUpdateCustomerProfile } from './customer-profiles.actions';
import {
  selectCustomerProfile,
  selectCustomerProfileLoading,
  selectCustomerProfileUpdating,
  selectCustomerProfileError,
  selectHasCustomerProfile,
} from './customer-profiles.selectors';

@Injectable({ providedIn: 'root' })
export class CustomerProfilesFacade {
  private readonly store = inject(Store);

  readonly profile$: Observable<CustomerProfileResponseDto | null> = this.store.select(selectCustomerProfile);
  readonly loading$: Observable<boolean> = this.store.select(selectCustomerProfileLoading);
  readonly updating$: Observable<boolean> = this.store.select(selectCustomerProfileUpdating);
  readonly error$: Observable<string | null> = this.store.select(selectCustomerProfileError);
  readonly hasProfile$: Observable<boolean> = this.store.select(selectHasCustomerProfile);

  loadCustomerProfile(): void {
    this.store.dispatch(loadCustomerProfile());
  }

  createOrUpdateCustomerProfile(dto: CustomerProfileDto): void {
    this.store.dispatch(createOrUpdateCustomerProfile({ dto }));
  }
}
