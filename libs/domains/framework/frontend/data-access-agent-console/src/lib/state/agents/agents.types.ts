// Types based on OpenAPI spec
export interface AgentResponseDto {
  id: string;
  name: string;
  description?: string;
  agentType: string;
  containerType: ContainerType;
  vnc?: {
    port: number;
    password: string;
  };
  openclaw?: {
    port: number;
  };
  ssh?: {
    port: number;
    password: string;
  };
  git?: {
    repositoryUrl: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentDto {
  name: string;
  description?: string;
  agentType?: string;
  containerType?: ContainerType;
  gitRepositoryUrl?: string;
  createVirtualWorkspace?: boolean;
  createSshConnection?: boolean;
}

export interface UpdateAgentDto {
  name?: string;
  description?: string;
  containerType?: ContainerType;
}

export interface CreateAgentResponseDto extends AgentResponseDto {
  password: string;
}

export interface ListClientAgentsParams {
  limit?: number;
  offset?: number;
}

export enum ContainerType {
  GENERIC = 'generic',
  DOCKER = 'docker',
  TERRAFORM = 'terraform',
  KUBERNETES = 'kubernetes',
}
