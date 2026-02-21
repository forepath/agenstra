import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type { BackorderResponseDto, BackorderRetryDto, BackorderCancelDto } from '../state/backorders/backorders.types';

@Injectable({
  providedIn: 'root',
})
export class BackordersService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  listBackorders(): Observable<BackorderResponseDto[]> {
    return this.http.get<BackorderResponseDto[]>(`${this.apiUrl}/backorders`);
  }

  retryBackorder(id: string, dto: BackorderRetryDto): Observable<BackorderResponseDto> {
    return this.http.post<BackorderResponseDto>(`${this.apiUrl}/backorders/${id}/retry`, dto);
  }

  cancelBackorder(id: string, dto: BackorderCancelDto): Observable<BackorderResponseDto> {
    return this.http.post<BackorderResponseDto>(`${this.apiUrl}/backorders/${id}/cancel`, dto);
  }
}
