import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { UsageSummaryDto, CreateUsageRecordDto } from './usage.types';
import { loadUsageSummary, recordUsage } from './usage.actions';
import { selectUsageSummary, selectUsageLoading, selectUsageRecording, selectUsageError } from './usage.selectors';

@Injectable({ providedIn: 'root' })
export class UsageFacade {
  private readonly store = inject(Store);

  readonly error$: Observable<string | null> = this.store.select(selectUsageError);

  loadUsageSummary(subscriptionId: string): void {
    this.store.dispatch(loadUsageSummary({ subscriptionId }));
  }

  recordUsage(dto: CreateUsageRecordDto): void {
    this.store.dispatch(recordUsage({ dto }));
  }

  getUsageSummary$(subscriptionId: string): Observable<UsageSummaryDto | null> {
    return this.store.select(selectUsageSummary(subscriptionId));
  }

  isLoading$(subscriptionId: string): Observable<boolean> {
    return this.store.select(selectUsageLoading(subscriptionId));
  }

  isRecording$(subscriptionId: string): Observable<boolean> {
    return this.store.select(selectUsageRecording(subscriptionId));
  }
}
