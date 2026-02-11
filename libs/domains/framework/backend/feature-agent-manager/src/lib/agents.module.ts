import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsDeploymentsController } from './agents-deployments.controller';
import { AgentsEnvironmentVariablesController } from './agents-environment-variables.controller';
import { AgentsFilesController } from './agents-files.controller';
import { AgentsVcsController } from './agents-vcs.controller';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { ConfigController } from './config.controller';
import { AgentEnvironmentVariableEntity } from './entities/agent-environment-variable.entity';
import { AgentMessageEntity } from './entities/agent-message.entity';
import { AgentEntity } from './entities/agent.entity';
import { DeploymentConfigurationEntity } from './entities/deployment-configuration.entity';
import { DeploymentRunEntity } from './entities/deployment-run.entity';
import { AgentProviderFactory } from './providers/agent-provider.factory';
import { CursorAgentProvider } from './providers/agents/cursor-agent.provider';
import { OpenClawAgentProvider } from './providers/agents/openclaw-agent.provider';
import { OpenCodeAgentProvider } from './providers/agents/opencode-agent.provider';
import { ChatFilterFactory } from './providers/chat-filter.factory';
import { BidirectionalChatFilter } from './providers/filters/bidirectional-chat-filter';
import { IncomingChatFilter } from './providers/filters/incoming-chat-filter';
import { NoopChatFilter } from './providers/filters/noop-chat-filter';
import { OutgoingChatFilter } from './providers/filters/outgoing-chat-filter';
import { PipelineProviderFactory } from './providers/pipeline-provider.factory';
import { GitHubProvider } from './providers/pipelines/github.provider';
import { GitLabProvider } from './providers/pipelines/gitlab.provider';
import { AgentEnvironmentVariablesRepository } from './repositories/agent-environment-variables.repository';
import { AgentMessagesRepository } from './repositories/agent-messages.repository';
import { AgentsRepository } from './repositories/agents.repository';
import { DeploymentConfigurationsRepository } from './repositories/deployment-configurations.repository';
import { DeploymentRunsRepository } from './repositories/deployment-runs.repository';
import { AgentEnvironmentVariablesService } from './services/agent-environment-variables.service';
import { AgentFileSystemService } from './services/agent-file-system.service';
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsVcsService } from './services/agents-vcs.service';
import { AgentsService } from './services/agents.service';
import { ConfigService } from './services/config.service';
import { DeploymentsService } from './services/deployments.service';
import { DockerService } from './services/docker.service';
import { PasswordService } from './services/password.service';

/**
 * Module for agent management feature.
 * Provides controllers, services, and repository for agent CRUD operations and file system operations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentEntity,
      AgentMessageEntity,
      AgentEnvironmentVariableEntity,
      DeploymentConfigurationEntity,
      DeploymentRunEntity,
    ]),
  ],
  controllers: [
    AgentsController,
    AgentsFilesController,
    AgentsVcsController,
    AgentsDeploymentsController,
    AgentsEnvironmentVariablesController,
    ConfigController,
  ],
  providers: [
    AgentsGateway,
    AgentsService,
    AgentMessagesService,
    AgentEnvironmentVariablesService,
    AgentFileSystemService,
    AgentsVcsService,
    ConfigService,
    PasswordService,
    DeploymentsService,
    AgentsRepository,
    AgentMessagesRepository,
    AgentEnvironmentVariablesRepository,
    DeploymentConfigurationsRepository,
    DeploymentRunsRepository,
    DockerService,
    AgentProviderFactory,
    CursorAgentProvider,
    OpenCodeAgentProvider,
    OpenClawAgentProvider,
    PipelineProviderFactory,
    GitHubProvider,
    GitLabProvider,
    ChatFilterFactory,
    NoopChatFilter,
    IncomingChatFilter,
    OutgoingChatFilter,
    BidirectionalChatFilter,
    {
      provide: 'AGENT_PROVIDER_INIT',
      useFactory: (
        factory: AgentProviderFactory,
        cursorProvider: CursorAgentProvider,
        opencodeProvider: OpenCodeAgentProvider,
        openclawProvider: OpenClawAgentProvider,
      ) => {
        factory.registerProvider(cursorProvider);
        factory.registerProvider(opencodeProvider);
        factory.registerProvider(openclawProvider);
        return true;
      },
      inject: [AgentProviderFactory, CursorAgentProvider, OpenCodeAgentProvider, OpenClawAgentProvider],
    },
    {
      provide: 'PIPELINE_PROVIDER_INIT',
      useFactory: (
        factory: PipelineProviderFactory,
        githubProvider: GitHubProvider,
        gitlabProvider: GitLabProvider,
      ) => {
        factory.registerProvider(githubProvider);
        factory.registerProvider(gitlabProvider);
        return true;
      },
      inject: [PipelineProviderFactory, GitHubProvider, GitLabProvider],
    },
    {
      provide: 'CHAT_FILTER_INIT',
      useFactory: (
        factory: ChatFilterFactory,
        noopFilter: NoopChatFilter,
        incomingFilter: IncomingChatFilter,
        outgoingFilter: OutgoingChatFilter,
        bidirectionalFilter: BidirectionalChatFilter,
      ) => {
        factory.registerFilter(noopFilter);
        factory.registerFilter(incomingFilter);
        factory.registerFilter(outgoingFilter);
        factory.registerFilter(bidirectionalFilter);
        return true;
      },
      inject: [ChatFilterFactory, NoopChatFilter, IncomingChatFilter, OutgoingChatFilter, BidirectionalChatFilter],
    },
  ],
  exports: [
    AgentsService,
    AgentEnvironmentVariablesService,
    AgentMessagesService,
    DeploymentsService,
    AgentsRepository,
    AgentEnvironmentVariablesRepository,
    AgentMessagesRepository,
    DeploymentConfigurationsRepository,
    DeploymentRunsRepository,
  ],
})
export class AgentsModule {}
