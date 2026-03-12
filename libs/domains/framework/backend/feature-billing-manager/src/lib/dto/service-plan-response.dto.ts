import { BillingIntervalType } from '../entities/service-plan.entity';

export class ServicePlanResponseDto {
  id!: string;
  serviceTypeId!: string;
  name!: string;
  description?: string;
  billingIntervalType!: BillingIntervalType;
  billingIntervalValue!: number;
  billingDayOfMonth?: number;
  cancelAtPeriodEnd!: boolean;
  minCommitmentDays!: number;
  noticeDays!: number;
  basePrice?: string;
  marginPercent?: string;
  marginFixed?: string;
  providerConfigDefaults!: Record<string, unknown>;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
