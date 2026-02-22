import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  CreateServiceTypeDto,
  ListParams,
  ServiceTypeResponse,
  UpdateServiceTypeDto,
} from '../types/billing.types';

@Injectable({
  providedIn: 'root',
})
export class ServiceTypesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  /**
   * Get the base URL for the billing API.
   */
  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  /**
   * List all service types with optional pagination.
   */
  listServiceTypes(params?: ListParams): Observable<ServiceTypeResponse[]> {
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http.get<ServiceTypeResponse[]>(`${this.apiUrl}/service-types`, {
      params: httpParams,
    });
  }

  /**
   * Get a service type by ID.
   */
  getServiceType(id: string): Observable<ServiceTypeResponse> {
    return this.http.get<ServiceTypeResponse>(`${this.apiUrl}/service-types/${id}`);
  }

  /**
   * Create a new service type (admin only).
   */
  createServiceType(serviceType: CreateServiceTypeDto): Observable<ServiceTypeResponse> {
    return this.http.post<ServiceTypeResponse>(`${this.apiUrl}/service-types`, serviceType);
  }

  /**
   * Update an existing service type (admin only).
   */
  updateServiceType(id: string, serviceType: UpdateServiceTypeDto): Observable<ServiceTypeResponse> {
    return this.http.post<ServiceTypeResponse>(`${this.apiUrl}/service-types/${id}`, serviceType);
  }

  /**
   * Delete a service type (admin only).
   */
  deleteServiceType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/service-types/${id}`);
  }
}
