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
import { OpenAiApiKeyGuard } from '../auth/openai-api-key.guard';
import { ClientStatisticsController } from '../controllers/client-statistics.controller';
import { ClientsDeploymentsController } from '../controllers/clients-deployments.controller';
import { ClientsVcsController } from '../controllers/clients-vcs.controller';
import { ClientsController } from '../controllers/clients.controller';
import { OpenAiV1Controller } from '../controllers/openai/openai-v1.controller';
import { StatisticsController } from '../controllers/statistics.controller';
import { TicketsController } from '../controllers/tickets.controller';
import { ClientAgentOpenAiApiKeyEntity } from '../entities/client-agent-openai-api-key.entity';
import { ProvisioningReferenceEntity } from '../entities/provisioning-reference.entity';
import { TicketActivityEntity } from '../entities/ticket-activity.entity';
import { TicketBodyGenerationSessionEntity } from '../entities/ticket-body-generation-session.entity';
import { TicketCommentEntity } from '../entities/ticket-comment.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { ClientsGateway } from '../gateways/clients.gateway';
import { DigitalOceanProvider } from '../providers/digital-ocean.provider';
import { HetznerProvider } from '../providers/hetzner.provider';
import { ProvisioningProviderFactory } from '../providers/provisioning-provider.factory';
import { ClientAgentOpenAiApiKeysRepository } from '../repositories/client-agent-openai-api-keys.repository';
import { ClientsRepository } from '../repositories/clients.repository';
import { ProvisioningReferencesRepository } from '../repositories/provisioning-references.repository';
import { ClientAgentDeploymentsProxyService } from '../services/client-agent-deployments-proxy.service';
import { ClientAgentEnvironmentVariablesProxyService } from '../services/client-agent-environment-variables-proxy.service';
import { ClientAgentFileSystemProxyService } from '../services/client-agent-file-system-proxy.service';
import { ClientAgentOpenAiApiKeysService } from '../services/client-agent-openai-api-keys.service';
import { ClientAgentProxyService } from '../services/client-agent-proxy.service';
import { OpenAiAgentWsProxyService } from '../services/openai/openai-agent-ws-proxy.service';
import { ClientAgentVcsProxyService } from '../services/client-agent-vcs-proxy.service';
import { ClientsService } from '../services/clients.service';
import { TicketsService } from '../services/tickets.service';
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
      ClientAgentOpenAiApiKeyEntity,
      ProvisioningReferenceEntity,
      ClientUserEntity,
      UserEntity,
      TicketEntity,
      TicketCommentEntity,
      TicketActivityEntity,
      TicketBodyGenerationSessionEntity,
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
    TicketsController,
    OpenAiV1Controller,
  ],
  providers: [
    ClientsService,
    TicketsService,
    ClientsRepository,
    ClientUsersRepository,
    ClientUsersService,
    UsersRepository,
    KeycloakTokenService,
    ClientAgentOpenAiApiKeysRepository,
    ClientAgentOpenAiApiKeysService,
    ClientAgentProxyService,
    OpenAiAgentWsProxyService,
    OpenAiApiKeyGuard,
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
