import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type {
  SubscriptionResponseDto,
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ResumeSubscriptionDto,
} from './subscriptions.types';
import {
  loadSubscriptions,
  loadSubscription,
  createSubscription,
  cancelSubscription,
  resumeSubscription,
} from './subscriptions.actions';
import {
  selectSubscriptions,
  selectSelectedSubscription,
  selectSubscriptionsLoading,
  selectSubscriptionLoading,
  selectSubscriptionsCreating,
  selectSubscriptionsCanceling,
  selectSubscriptionsResuming,
  selectSubscriptionsError,
  selectSubscriptionsLoadingAny,
  selectSubscriptionById,
  selectSubscriptionsCount,
  selectHasSubscriptions,
  selectActiveSubscriptions,
} from './subscriptions.selectors';

@Injectable({ providedIn: 'root' })
export class SubscriptionsFacade {
  private readonly store = inject(Store);

  readonly subscriptions$: Observable<SubscriptionResponseDto[]> = this.store.select(selectSubscriptions);
  readonly selectedSubscription$: Observable<SubscriptionResponseDto | null> =
    this.store.select(selectSelectedSubscription);
  readonly loading$: Observable<boolean> = this.store.select(selectSubscriptionsLoading);
  readonly loadingSubscription$: Observable<boolean> = this.store.select(selectSubscriptionLoading);
  readonly creating$: Observable<boolean> = this.store.select(selectSubscriptionsCreating);
  readonly canceling$: Observable<boolean> = this.store.select(selectSubscriptionsCanceling);
  readonly resuming$: Observable<boolean> = this.store.select(selectSubscriptionsResuming);
  readonly error$: Observable<string | null> = this.store.select(selectSubscriptionsError);
  readonly loadingAny$: Observable<boolean> = this.store.select(selectSubscriptionsLoadingAny);
  readonly subscriptionsCount$: Observable<number> = this.store.select(selectSubscriptionsCount);
  readonly hasSubscriptions$: Observable<boolean> = this.store.select(selectHasSubscriptions);
  readonly activeSubscriptions$: Observable<SubscriptionResponseDto[]> = this.store.select(selectActiveSubscriptions);

  loadSubscriptions(): void {
    this.store.dispatch(loadSubscriptions());
  }

  loadSubscription(id: string): void {
    this.store.dispatch(loadSubscription({ id }));
  }

  createSubscription(dto: CreateSubscriptionDto): void {
    this.store.dispatch(createSubscription({ dto }));
  }

  cancelSubscription(id: string, dto: CancelSubscriptionDto): void {
    this.store.dispatch(cancelSubscription({ id, dto }));
  }

  resumeSubscription(id: string, dto: ResumeSubscriptionDto): void {
    this.store.dispatch(resumeSubscription({ id, dto }));
  }

  getSubscriptionById$(id: string): Observable<SubscriptionResponseDto | null> {
    return this.store.select(selectSubscriptionById(id));
  }
}
