import { BillingIntervalType } from '../../shared/billing.enums';

export interface PricingPreviewRequestDto {
  planId: string;
  requestedConfig?: Record<string, unknown>;
  quantity?: number;
}

export interface PricingPreviewResponseDto {
  basePrice: string;
  marginPercent?: string;
  marginFixed?: string;
  totalPrice: string;
  currency: string;
  billingIntervalType: BillingIntervalType;
  billingIntervalValue: number;
}
