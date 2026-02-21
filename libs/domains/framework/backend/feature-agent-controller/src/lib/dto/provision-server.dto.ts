import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuthenticationType } from '@forepath/identity/backend';

/**
 * DTO for provisioning a new server through a cloud provider.
 */
export class ProvisionServerDto {
  @IsNotEmpty({ message: 'Provider type is required' })
  @IsString({ message: 'Provider type must be a string' })
  providerType!: string;

  @IsNotEmpty({ message: 'Server type is required' })
  @IsString({ message: 'Server type must be a string' })
  serverType!: string;

  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  location?: string;

  @IsNotEmpty({ message: 'Authentication type is required' })
  @IsEnum(AuthenticationType, { message: 'Authentication type must be either api_key or keycloak' })
  authenticationType!: AuthenticationType;

  @IsOptional()
  @IsString({ message: 'API key must be a string' })
  apiKey?: string;

  @IsOptional()
  @IsString({ message: 'Keycloak client ID must be a string' })
  keycloakClientId?: string;

  @IsOptional()
  @IsString({ message: 'Keycloak client secret must be a string' })
  keycloakClientSecret?: string;

  @IsOptional()
  @IsString({ message: 'Keycloak realm must be a string' })
  keycloakRealm?: string;

  @IsOptional()
  @IsString({ message: 'Keycloak auth server URL must be a string' })
  keycloakAuthServerUrl?: string;

  @IsOptional()
  @IsInt({ message: 'Agent WebSocket port must be an integer' })
  @Min(1)
  @Max(65535)
  agentWsPort?: number;

  @IsOptional()
  @IsString({ message: 'Git repository URL must be a string' })
  gitRepositoryUrl?: string;

  @IsOptional()
  @IsString({ message: 'Git username must be a string' })
  gitUsername?: string;

  @IsOptional()
  @IsString({ message: 'Git token must be a string' })
  gitToken?: string;

  @IsOptional()
  @IsString({ message: 'Git password must be a string' })
  gitPassword?: string;

  @IsOptional()
  @IsString({ message: 'Git private key must be a string' })
  gitPrivateKey?: string;

  @IsOptional()
  @IsString({ message: 'Cursor API key must be a string' })
  cursorApiKey?: string;

  @IsOptional()
  @IsString({ message: 'Agent default image must be a string' })
  agentDefaultImage?: string;
}
