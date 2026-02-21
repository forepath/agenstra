import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { BackorderResponseDto, BackorderRetryDto, BackorderCancelDto } from './backorders.types';
import { loadBackorders, retryBackorder, cancelBackorder } from './backorders.actions';
import {
  selectBackorders,
  selectBackordersLoading,
  selectBackordersRetrying,
  selectBackordersCanceling,
  selectBackordersError,
  selectBackorderById,
  selectBackordersCount,
  selectHasBackorders,
  selectPendingBackorders,
} from './backorders.selectors';

@Injectable({ providedIn: 'root' })
export class BackordersFacade {
  private readonly store = inject(Store);

  readonly backorders$: Observable<BackorderResponseDto[]> = this.store.select(selectBackorders);
  readonly loading$: Observable<boolean> = this.store.select(selectBackordersLoading);
  readonly error$: Observable<string | null> = this.store.select(selectBackordersError);
  readonly backordersCount$: Observable<number> = this.store.select(selectBackordersCount);
  readonly hasBackorders$: Observable<boolean> = this.store.select(selectHasBackorders);
  readonly pendingBackorders$: Observable<BackorderResponseDto[]> = this.store.select(selectPendingBackorders);

  loadBackorders(): void {
    this.store.dispatch(loadBackorders());
  }

  retryBackorder(id: string, dto: BackorderRetryDto = {}): void {
    this.store.dispatch(retryBackorder({ id, dto }));
  }

  cancelBackorder(id: string, dto: BackorderCancelDto = {}): void {
    this.store.dispatch(cancelBackorder({ id, dto }));
  }

  getBackorderById$(id: string): Observable<BackorderResponseDto | null> {
    return this.store.select(selectBackorderById(id));
  }

  isRetrying$(id: string): Observable<boolean> {
    return this.store.select(selectBackordersRetrying(id));
  }

  isCanceling$(id: string): Observable<boolean> {
    return this.store.select(selectBackordersCanceling(id));
  }
}
