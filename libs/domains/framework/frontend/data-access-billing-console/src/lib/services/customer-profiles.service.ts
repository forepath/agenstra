import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  CustomerProfileResponseDto,
  CustomerProfileDto,
} from '../state/customer-profiles/customer-profiles.types';

@Injectable({
  providedIn: 'root',
})
export class CustomerProfilesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  getCustomerProfile(): Observable<CustomerProfileResponseDto> {
    return this.http.get<CustomerProfileResponseDto>(`${this.apiUrl}/customer-profile`);
  }

  createOrUpdateCustomerProfile(dto: CustomerProfileDto): Observable<CustomerProfileResponseDto> {
    return this.http.post<CustomerProfileResponseDto>(`${this.apiUrl}/customer-profile`, dto);
  }
}
