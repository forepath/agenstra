export interface ServiceTypeResponseDto {
  id: string;
  key: string;
  name: string;
  description?: string;
  provider: string;
  configSchema: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceTypeDto {
  key: string;
  name: string;
  description?: string;
  provider: string;
  configSchema: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateServiceTypeDto {
  key?: string;
  name?: string;
  description?: string;
  provider?: string;
  configSchema?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ListServiceTypesParams {
  limit?: number;
  offset?: number;
}
