// Types based on OpenAPI spec
export type ClientAuthenticationType = 'api_key' | 'keycloak';

export interface AgentTypeInfo {
  type: string;
  displayName: string;
}

export interface ConfigResponseDto {
  gitRepositoryUrl?: string | null;
  agentTypes: AgentTypeInfo[];
}

export interface ClientResponseDto {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  authenticationType: ClientAuthenticationType;
  agentWsPort?: number;
  config?: ConfigResponseDto;
  isAutoProvisioned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  description?: string;
  endpoint: string;
  authenticationType: ClientAuthenticationType;
  apiKey?: string;
  keycloakClientId?: string;
  keycloakClientSecret?: string;
  keycloakRealm?: string;
  keycloakAuthServerUrl?: string;
  agentWsPort?: number;
  gitRepositoryUrl?: string;
  gitUsername?: string;
  gitToken?: string;
  gitPassword?: string;
  gitPrivateKey?: string;
  cursorApiKey?: string;
  agentDefaultImage?: string;
}

export interface UpdateClientDto {
  name?: string;
  description?: string;
  endpoint?: string;
  authenticationType?: ClientAuthenticationType;
  apiKey?: string;
  keycloakClientId?: string;
  keycloakClientSecret?: string;
  keycloakRealm?: string;
  agentWsPort?: number;
}

export interface CreateClientResponseDto extends ClientResponseDto {
  apiKey?: string;
}

export interface ListClientsParams {
  limit?: number;
  offset?: number;
}

// Provisioning types
export interface ProvisioningProviderInfo {
  type: string;
  displayName: string;
}

export interface ServerType {
  id: string;
  name: string;
  cores: number;
  memory: number;
  disk: number;
  priceMonthly?: number;
  priceHourly?: number;
  description?: string;
}

export interface ProvisionServerDto {
  providerType: string;
  serverType: string;
  name: string;
  description?: string;
  location?: string;
  authenticationType: ClientAuthenticationType;
  apiKey?: string;
  keycloakClientId?: string;
  keycloakClientSecret?: string;
  keycloakRealm?: string;
  keycloakAuthServerUrl?: string;
  agentWsPort?: number;
  gitRepositoryUrl?: string;
  gitUsername?: string;
  gitToken?: string;
  gitPassword?: string;
  gitPrivateKey?: string;
  cursorApiKey?: string;
  agentDefaultImage?: string;
}

export interface ProvisionedServerResponseDto extends ClientResponseDto {
  providerType: string;
  serverId: string;
  serverName: string;
  publicIp: string;
  privateIp?: string;
  serverStatus: string;
}

export interface ServerInfo {
  serverId: string;
  serverName?: string;
  publicIp?: string;
  privateIp?: string;
  serverStatus?: string;
  providerType: string;
}

// Client user management (per-client permissions)
export type ClientUserRole = 'admin' | 'user';

export interface ClientUserResponseDto {
  id: string;
  userId: string;
  clientId: string;
  role: ClientUserRole;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddClientUserDto {
  email: string;
  role: ClientUserRole;
}
