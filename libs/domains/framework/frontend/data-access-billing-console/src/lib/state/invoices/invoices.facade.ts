import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { InvoiceResponseDto, CreateInvoiceDto } from './invoices.types';
import { loadInvoices, createInvoice } from './invoices.actions';
import {
  selectInvoicesBySubscription,
  selectInvoicesLoading,
  selectInvoicesCreating,
  selectInvoicesError,
} from './invoices.selectors';

@Injectable({ providedIn: 'root' })
export class InvoicesFacade {
  private readonly store = inject(Store);

  readonly error$: Observable<string | null> = this.store.select(selectInvoicesError);

  loadInvoices(subscriptionId: string): void {
    this.store.dispatch(loadInvoices({ subscriptionId }));
  }

  createInvoice(subscriptionId: string, dto: CreateInvoiceDto): void {
    this.store.dispatch(createInvoice({ subscriptionId, dto }));
  }

  getInvoicesBySubscription$(subscriptionId: string): Observable<InvoiceResponseDto[]> {
    return this.store.select(selectInvoicesBySubscription(subscriptionId));
  }

  isLoading$(subscriptionId: string): Observable<boolean> {
    return this.store.select(selectInvoicesLoading(subscriptionId));
  }

  isCreating$(subscriptionId: string): Observable<boolean> {
    return this.store.select(selectInvoicesCreating(subscriptionId));
  }
}
