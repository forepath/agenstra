export interface AvailabilityCheckDto {
  serviceTypeId: string;
  region?: string;
  serverType?: string;
  requestedConfig?: Record<string, unknown>;
}

export interface AvailabilityResponseDto {
  available: boolean;
  availableCount?: number;
  region?: string;
  serverType?: string;
  checkedAt: string;
}

export interface AlternativeConfigDto {
  region?: string;
  serverType?: string;
  config: Record<string, unknown>;
  available: boolean;
}
