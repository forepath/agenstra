import { BillingIntervalType } from '../../shared/billing.enums';

export interface ServicePlanResponseDto {
  id: string;
  serviceTypeId: string;
  name: string;
  description?: string;
  billingIntervalType: BillingIntervalType;
  billingIntervalValue: number;
  billingDayOfMonth?: number;
  cancelAtPeriodEnd: boolean;
  minCommitmentDays: number;
  noticeDays: number;
  basePrice?: string;
  marginPercent?: string;
  marginFixed?: string;
  providerConfigDefaults: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePlanDto {
  serviceTypeId: string;
  name: string;
  description?: string;
  billingIntervalType: BillingIntervalType;
  billingIntervalValue: number;
  billingDayOfMonth?: number;
  cancelAtPeriodEnd?: boolean;
  minCommitmentDays?: number;
  noticeDays?: number;
  basePrice?: string;
  marginPercent?: string;
  marginFixed?: string;
  providerConfigDefaults?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateServicePlanDto {
  name?: string;
  description?: string;
  billingIntervalType?: BillingIntervalType;
  billingIntervalValue?: number;
  billingDayOfMonth?: number;
  cancelAtPeriodEnd?: boolean;
  minCommitmentDays?: number;
  noticeDays?: number;
  basePrice?: string;
  marginPercent?: string;
  marginFixed?: string;
  providerConfigDefaults?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ListServicePlansParams {
  limit?: number;
  offset?: number;
  serviceTypeId?: string;
}
