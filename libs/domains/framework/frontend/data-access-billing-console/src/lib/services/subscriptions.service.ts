import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  SubscriptionResponseDto,
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ResumeSubscriptionDto,
} from '../state/subscriptions/subscriptions.types';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  listSubscriptions(): Observable<SubscriptionResponseDto[]> {
    return this.http.get<SubscriptionResponseDto[]>(`${this.apiUrl}/subscriptions`);
  }

  getSubscription(id: string): Observable<SubscriptionResponseDto> {
    return this.http.get<SubscriptionResponseDto>(`${this.apiUrl}/subscriptions/${id}`);
  }

  createSubscription(dto: CreateSubscriptionDto): Observable<SubscriptionResponseDto> {
    return this.http.post<SubscriptionResponseDto>(`${this.apiUrl}/subscriptions`, dto);
  }

  cancelSubscription(id: string, dto: CancelSubscriptionDto): Observable<SubscriptionResponseDto> {
    return this.http.post<SubscriptionResponseDto>(`${this.apiUrl}/subscriptions/${id}/cancel`, dto);
  }

  resumeSubscription(id: string, dto: ResumeSubscriptionDto): Observable<SubscriptionResponseDto> {
    return this.http.post<SubscriptionResponseDto>(`${this.apiUrl}/subscriptions/${id}/resume`, dto);
  }
}
