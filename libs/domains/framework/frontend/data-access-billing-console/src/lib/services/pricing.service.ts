import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type { PricingPreviewRequestDto, PricingPreviewResponseDto } from '../state/pricing/pricing.types';

@Injectable({
  providedIn: 'root',
})
export class PricingService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  previewPricing(dto: PricingPreviewRequestDto): Observable<PricingPreviewResponseDto> {
    return this.http.post<PricingPreviewResponseDto>(`${this.apiUrl}/pricing/preview`, dto);
  }
}
