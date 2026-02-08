import { getAuthenticationMethod, KeycloakService } from '@forepath/identity/backend';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { ClientStatisticsController } from './client-statistics.controller';
import { ClientsDeploymentsController } from './clients-deployments.controller';
import { ClientsVcsController } from './clients-vcs.controller';
import { ClientsController } from './clients.controller';
import { StatisticsController } from './statistics.controller';
import { ClientsGateway } from './clients.gateway';
import { ClientAgentCredentialEntity } from './entities/client-agent-credential.entity';
import { ClientEntity } from './entities/client.entity';
import { ClientUserEntity } from './entities/client-user.entity';
import { ProvisioningReferenceEntity } from './entities/provisioning-reference.entity';
import { UserEntity } from './entities/user.entity';
import { DigitalOceanProvider } from './providers/digital-ocean.provider';
import { HetznerProvider } from './providers/hetzner.provider';
import { ProvisioningProviderFactory } from './providers/provisioning-provider.factory';
import { StatisticsModule } from './statistics.module';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientUsersRepository } from './repositories/client-users.repository';
import { ClientsRepository } from './repositories/clients.repository';
import { ProvisioningReferencesRepository } from './repositories/provisioning-references.repository';
import { UsersRepository } from './repositories/users.repository';
import { ClientAgentCredentialsService } from './services/client-agent-credentials.service';
import { ClientAgentDeploymentsProxyService } from './services/client-agent-deployments-proxy.service';
import { ClientAgentEnvironmentVariablesProxyService } from './services/client-agent-environment-variables-proxy.service';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientAgentVcsProxyService } from './services/client-agent-vcs-proxy.service';
import { ClientUsersService } from './services/client-users.service';
import { ClientsService } from './services/clients.service';
import { KeycloakTokenService } from './services/keycloak-token.service';
import { ProvisioningService } from './services/provisioning.service';
import { SocketAuthService } from './services/socket-auth.service';
import { StatisticsAgentSyncService } from './services/statistics-agent-sync.service';

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
