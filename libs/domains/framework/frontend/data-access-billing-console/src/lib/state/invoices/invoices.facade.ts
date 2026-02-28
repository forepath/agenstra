import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  clearInvoices,
  createInvoice,
  loadInvoices,
  loadInvoicesSummary as loadInvoicesSummaryAction,
  loadOpenOverdueInvoices,
  refreshInvoiceLink as refreshInvoiceLinkAction,
  refreshInvoiceLinkFailure,
  refreshInvoiceLinkSuccess,
} from './invoices.actions';
import {
  selectHasInvoicesBySubscriptionId,
  selectInvoicesBySubscriptionId,
  selectInvoicesCreating,
  selectInvoicesCountBySubscriptionId,
  selectInvoicesError,
  selectInvoicesLoading,
  selectInvoicesLoadingAny,
  selectInvoicesSummary,
  selectInvoicesSummaryError,
  selectInvoicesSummaryLoading,
  selectOpenOverdueList,
  selectOpenOverdueListError,
  selectOpenOverdueListLoading,
  selectRefreshingInvoiceRefId,
} from './invoices.selectors';
import type { CreateInvoiceDto, InvoiceResponse, InvoicesSummaryResponse } from '../../types/billing.types';
import { InvoicesService } from '../../services/invoices.service';

@Injectable({
  providedIn: 'root',
})
export class InvoicesFacade {
  private readonly store = inject(Store);
  private readonly invoicesService = inject(InvoicesService);

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

  getRefreshingInvoiceRefId$(): Observable<string | null> {
    return this.store.select(selectRefreshingInvoiceRefId);
  }

  getInvoicesSummary$(): Observable<InvoicesSummaryResponse | null> {
    return this.store.select(selectInvoicesSummary);
  }

  getInvoicesSummaryLoading$(): Observable<boolean> {
    return this.store.select(selectInvoicesSummaryLoading);
  }

  getInvoicesSummaryError$(): Observable<string | null> {
    return this.store.select(selectInvoicesSummaryError);
  }

  loadInvoicesSummary(): void {
    this.store.dispatch(loadInvoicesSummaryAction());
  }

  getOpenOverdueList$(): Observable<InvoiceResponse[]> {
    return this.store.select(selectOpenOverdueList);
  }

  getOpenOverdueListLoading$(): Observable<boolean> {
    return this.store.select(selectOpenOverdueListLoading);
  }

  getOpenOverdueListError$(): Observable<string | null> {
    return this.store.select(selectOpenOverdueListError);
  }

  loadOpenOverdueInvoices(): void {
    this.store.dispatch(loadOpenOverdueInvoices());
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

  /**
   * Fetches a fresh invite link for the invoice and updates the store. Returns an observable that
   * emits the new preAuthUrl on success (e.g. for opening in a new tab) or throws on error.
   */
  refreshInvoiceLink(subscriptionId: string, invoiceRefId: string): Observable<string> {
    this.store.dispatch(refreshInvoiceLinkAction({ subscriptionId, invoiceRefId }));
    return this.invoicesService.refreshInvoiceLink(subscriptionId, invoiceRefId).pipe(
      tap((response) =>
        this.store.dispatch(
          refreshInvoiceLinkSuccess({
            subscriptionId,
            invoiceRefId,
            preAuthUrl: response.preAuthUrl,
          }),
        ),
      ),
      map((response) => response.preAuthUrl),
      catchError((error) => {
        const message = error?.error?.message ?? error?.message ?? 'Failed to refresh invoice link';
        this.store.dispatch(refreshInvoiceLinkFailure({ error: message }));
        throw error;
      }),
    );
  }

  clearInvoices(): void {
    this.store.dispatch(clearInvoices());
  }
}
