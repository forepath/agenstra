import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  AvailabilityCheckDto,
  AvailabilityResponseDto,
  AlternativeConfigDto,
} from '../state/availability/availability.types';

@Injectable({
  providedIn: 'root',
})
export class AvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  checkAvailability(dto: AvailabilityCheckDto): Observable<AvailabilityResponseDto> {
    return this.http.post<AvailabilityResponseDto>(`${this.apiUrl}/availability/check`, dto);
  }

  getAlternatives(dto: AvailabilityCheckDto): Observable<AlternativeConfigDto[]> {
    return this.http.post<AlternativeConfigDto[]>(`${this.apiUrl}/availability/alternatives`, dto);
  }
}
