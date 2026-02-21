import { IsBoolean, IsEnum, IsInt, IsNumberString, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { BillingIntervalType } from '../entities/service-plan.entity';

export class UpdateServicePlanDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsEnum(BillingIntervalType, { message: 'Billing interval type must be hour, day, or month' })
  billingIntervalType?: BillingIntervalType;

  @IsOptional()
  @IsInt({ message: 'Billing interval value must be an integer' })
  @Min(1)
  billingIntervalValue?: number;

  @IsOptional()
  @IsInt({ message: 'Billing day of month must be an integer' })
  @Min(1)
  @Max(31)
  billingDayOfMonth?: number;

  @IsOptional()
  @IsBoolean({ message: 'cancelAtPeriodEnd must be a boolean' })
  cancelAtPeriodEnd?: boolean;

  @IsOptional()
  @IsInt({ message: 'minCommitmentDays must be an integer' })
  @Min(0)
  minCommitmentDays?: number;

  @IsOptional()
  @IsInt({ message: 'noticeDays must be an integer' })
  @Min(0)
  noticeDays?: number;

  @IsOptional()
  @IsNumberString({}, { message: 'Base price must be a numeric string' })
  basePrice?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Margin percent must be a numeric string' })
  marginPercent?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Margin fixed must be a numeric string' })
  marginFixed?: string;

  @IsOptional()
  @IsObject({ message: 'Provider config defaults must be an object' })
  providerConfigDefaults?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
