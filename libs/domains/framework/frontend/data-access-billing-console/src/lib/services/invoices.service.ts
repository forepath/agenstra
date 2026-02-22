import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type { CreateInvoiceDto, CreateInvoiceResponse, InvoiceResponse } from '../types/billing.types';

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  /**
   * Get the base URL for the billing API.
   */
  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  /**
   * List all invoices for a subscription.
   */
  listInvoices(subscriptionId: string): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/invoices/${subscriptionId}`);
  }

  /**
   * Create an invoice for a subscription.
   */
  createInvoice(subscriptionId: string, dto?: CreateInvoiceDto): Observable<CreateInvoiceResponse> {
    return this.http.post<CreateInvoiceResponse>(`${this.apiUrl}/invoices/${subscriptionId}`, dto ?? {});
  }
}
