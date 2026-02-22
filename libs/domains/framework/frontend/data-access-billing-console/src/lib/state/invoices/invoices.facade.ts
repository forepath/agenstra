import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { clearInvoices, createInvoice, loadInvoices } from './invoices.actions';
import {
  selectHasInvoicesBySubscriptionId,
  selectInvoicesBySubscriptionId,
  selectInvoicesCreating,
  selectInvoicesCountBySubscriptionId,
  selectInvoicesError,
  selectInvoicesLoading,
  selectInvoicesLoadingAny,
} from './invoices.selectors';
import type { CreateInvoiceDto, InvoiceResponse } from '../../types/billing.types';

@Injectable({
  providedIn: 'root',
})
export class InvoicesFacade {
  private readonly store = inject(Store);

  getInvoicesBySubscriptionId$(subscriptionId: string): Observable<InvoiceResponse[]> {
    return this.store.select(selectInvoicesBySubscriptionId(subscriptionId));
  }

  getInvoicesLoading$(): Observable<boolean> {
    return this.store.select(selectInvoicesLoading);
  }

  getInvoicesCreating$(): Observable<boolean> {
    return this.store.select(selectInvoicesCreating);
  }

  getInvoicesLoadingAny$(): Observable<boolean> {
    return this.store.select(selectInvoicesLoadingAny);
  }

  getInvoicesError$(): Observable<string | null> {
    return this.store.select(selectInvoicesError);
  }

  getInvoicesCountBySubscriptionId$(subscriptionId: string): Observable<number> {
    return this.store.select(selectInvoicesCountBySubscriptionId(subscriptionId));
  }

  hasInvoicesBySubscriptionId$(subscriptionId: string): Observable<boolean> {
    return this.store.select(selectHasInvoicesBySubscriptionId(subscriptionId));
  }

  loadInvoices(subscriptionId: string): void {
    this.store.dispatch(loadInvoices({ subscriptionId }));
  }

  createInvoice(subscriptionId: string, dto?: CreateInvoiceDto): void {
    this.store.dispatch(createInvoice({ subscriptionId, dto }));
  }

  clearInvoices(): void {
    this.store.dispatch(clearInvoices());
  }
}
