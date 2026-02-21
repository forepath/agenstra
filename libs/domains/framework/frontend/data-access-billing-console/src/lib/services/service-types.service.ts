import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  ServiceTypeResponseDto,
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  ListServiceTypesParams,
} from '../state/service-types/service-types.types';

@Injectable({
  providedIn: 'root',
})
export class ServiceTypesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  listServiceTypes(params?: ListServiceTypesParams): Observable<ServiceTypeResponseDto[]> {
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<ServiceTypeResponseDto[]>(`${this.apiUrl}/service-types`, { params: httpParams });
  }

  getServiceType(id: string): Observable<ServiceTypeResponseDto> {
    return this.http.get<ServiceTypeResponseDto>(`${this.apiUrl}/service-types/${id}`);
  }

  createServiceType(dto: CreateServiceTypeDto): Observable<ServiceTypeResponseDto> {
    return this.http.post<ServiceTypeResponseDto>(`${this.apiUrl}/service-types`, dto);
  }

  updateServiceType(id: string, dto: UpdateServiceTypeDto): Observable<ServiceTypeResponseDto> {
    return this.http.post<ServiceTypeResponseDto>(`${this.apiUrl}/service-types/${id}`, dto);
  }

  deleteServiceType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/service-types/${id}`);
  }
}
