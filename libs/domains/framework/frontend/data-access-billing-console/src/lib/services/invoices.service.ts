import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type { InvoiceResponseDto, CreateInvoiceDto } from '../state/invoices/invoices.types';

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  listInvoices(subscriptionId: string): Observable<InvoiceResponseDto[]> {
    return this.http.get<InvoiceResponseDto[]>(`${this.apiUrl}/invoices/${subscriptionId}`);
  }

  createInvoice(subscriptionId: string, dto: CreateInvoiceDto): Observable<InvoiceResponseDto> {
    return this.http.post<InvoiceResponseDto>(`${this.apiUrl}/invoices/${subscriptionId}`, dto);
  }
}
