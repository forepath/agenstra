import {
  ClientAgentCredentialEntity,
  ClientAgentCredentialsRepository,
  ClientAgentCredentialsService,
  ClientEntity,
  ClientUserEntity,
  ClientUsersRepository,
  ClientUsersService,
  getAuthenticationMethod,
  KeycloakService,
  KeycloakTokenService,
  SocketAuthService,
  UserEntity,
  UsersRepository,
} from '@forepath/identity/backend';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { ClientStatisticsController } from '../controllers/client-statistics.controller';
import { ClientsDeploymentsController } from '../controllers/clients-deployments.controller';
import { ClientsVcsController } from '../controllers/clients-vcs.controller';
import { ClientsController } from '../controllers/clients.controller';
import { StatisticsController } from '../controllers/statistics.controller';
import { ProvisioningReferenceEntity } from '../entities/provisioning-reference.entity';
import { ClientsGateway } from '../gateways/clients.gateway';
import { DigitalOceanProvider } from '../providers/digital-ocean.provider';
import { HetznerProvider } from '../providers/hetzner.provider';
import { ProvisioningProviderFactory } from '../providers/provisioning-provider.factory';
import { ClientsRepository } from '../repositories/clients.repository';
import { ProvisioningReferencesRepository } from '../repositories/provisioning-references.repository';
import { ClientAgentDeploymentsProxyService } from '../services/client-agent-deployments-proxy.service';
import { ClientAgentEnvironmentVariablesProxyService } from '../services/client-agent-environment-variables-proxy.service';
import { ClientAgentFileSystemProxyService } from '../services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from '../services/client-agent-proxy.service';
import { ClientAgentVcsProxyService } from '../services/client-agent-vcs-proxy.service';
import { ClientsService } from '../services/clients.service';
import { ProvisioningService } from '../services/provisioning.service';
import { StatisticsAgentSyncService } from '../services/statistics-agent-sync.service';
import { StatisticsModule } from './statistics.module';

const authMethod = getAuthenticationMethod();

/**
 * Module for agent clients feature.
 * Provides controllers, services, and repository for agent CRUD operations and file system operations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientEntity,
      ClientAgentCredentialEntity,
      ProvisioningReferenceEntity,
      ClientUserEntity,
      UserEntity,
    ]),
    StatisticsModule,
    // Import KeycloakConnectModule conditionally to make KEYCLOAK_INSTANCE available to SocketAuthService
    ...(authMethod === 'keycloak' ? [KeycloakConnectModule.registerAsync({ useExisting: KeycloakService })] : []),
  ],
  controllers: [
    ClientsController,
    ClientsVcsController,
    ClientsDeploymentsController,
    ClientStatisticsController,
    StatisticsController,
  ],
  providers: [
    ClientsService,
    ClientsRepository,
    ClientUsersRepository,
    ClientUsersService,
    UsersRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentFileSystemProxyService,
    ClientAgentVcsProxyService,
    ClientAgentDeploymentsProxyService,
    ClientAgentEnvironmentVariablesProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    SocketAuthService,
    ClientsGateway,
    ProvisioningService,
    ProvisioningProviderFactory,
    ProvisioningReferencesRepository,
    HetznerProvider,
    DigitalOceanProvider,
    StatisticsAgentSyncService,
    {
      provide: 'PROVISIONING_PROVIDERS',
      useFactory: (
        factory: ProvisioningProviderFactory,
        hetzner: HetznerProvider,
        digitalOcean: DigitalOceanProvider,
      ) => {
        factory.registerProvider(hetzner);
        factory.registerProvider(digitalOcean);
        return factory;
      },
      inject: [ProvisioningProviderFactory, HetznerProvider, DigitalOceanProvider],
    },
  ],
  exports: [
    ClientsService,
    ClientsRepository,
    ClientUsersRepository,
    ClientUsersService,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentFileSystemProxyService,
    ClientAgentVcsProxyService,
    ClientAgentDeploymentsProxyService,
    ClientAgentEnvironmentVariablesProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
    ProvisioningService,
    ProvisioningProviderFactory,
  ],
})
export class ClientsModule {}
