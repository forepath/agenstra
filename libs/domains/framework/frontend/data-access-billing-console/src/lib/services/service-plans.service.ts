import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  ServicePlanResponseDto,
  CreateServicePlanDto,
  UpdateServicePlanDto,
  ListServicePlansParams,
} from '../state/service-plans/service-plans.types';

@Injectable({
  providedIn: 'root',
})
export class ServicePlansService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  listServicePlans(params?: ListServicePlansParams): Observable<ServicePlanResponseDto[]> {
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    if (params?.serviceTypeId !== undefined) {
      httpParams = httpParams.set('serviceTypeId', params.serviceTypeId);
    }
    return this.http.get<ServicePlanResponseDto[]>(`${this.apiUrl}/service-plans`, { params: httpParams });
  }

  getServicePlan(id: string): Observable<ServicePlanResponseDto> {
    return this.http.get<ServicePlanResponseDto>(`${this.apiUrl}/service-plans/${id}`);
  }

  createServicePlan(dto: CreateServicePlanDto): Observable<ServicePlanResponseDto> {
    return this.http.post<ServicePlanResponseDto>(`${this.apiUrl}/service-plans`, dto);
  }

  updateServicePlan(id: string, dto: UpdateServicePlanDto): Observable<ServicePlanResponseDto> {
    return this.http.post<ServicePlanResponseDto>(`${this.apiUrl}/service-plans/${id}`, dto);
  }

  deleteServicePlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/service-plans/${id}`);
  }
}
