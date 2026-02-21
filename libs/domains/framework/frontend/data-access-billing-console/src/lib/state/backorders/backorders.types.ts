import { BackorderStatus } from '../../shared/billing.enums';

export interface BackorderResponseDto {
  id: string;
  subscriptionId: string;
  userId: string;
  status: BackorderStatus;
  serviceTypeId: string;
  requestedConfig?: Record<string, unknown>;
  lastRetryAt?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export type BackorderRetryDto = Record<string, never>;

export type BackorderCancelDto = Record<string, never>;
