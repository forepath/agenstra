import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type { UsageSummaryDto, CreateUsageRecordDto } from '../state/usage/usage.types';

@Injectable({
  providedIn: 'root',
})
export class UsageService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  getUsageSummary(subscriptionId: string): Observable<UsageSummaryDto> {
    return this.http.get<UsageSummaryDto>(`${this.apiUrl}/usage/summary/${subscriptionId}`);
  }

  recordUsage(dto: CreateUsageRecordDto): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/usage/record`, dto);
  }
}
