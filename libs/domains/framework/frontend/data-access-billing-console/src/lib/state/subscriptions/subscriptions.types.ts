import { SubscriptionStatus } from '../../shared/billing.enums';

export interface SubscriptionResponseDto {
  id: string;
  planId: string;
  userId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingAt?: string;
  cancelRequestedAt?: string;
  cancelEffectiveAt?: string;
  resumedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionDto {
  planId: string;
  requestedConfig?: Record<string, unknown>;
  preferredAlternatives?: Record<string, unknown>;
  autoBackorder?: boolean;
}

export interface CancelSubscriptionDto {
  reason?: string;
}

export type ResumeSubscriptionDto = Record<string, never>;
