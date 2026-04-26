import { Injectable } from '@nestjs/common';

import { AgentProviderFactory } from '../providers/agent-provider.factory';

/**
 * Service for retrieving configuration parameters.
 * Provides access to environment-based configuration values.
 */
@Injectable()
export class ConfigService {
  constructor(private readonly agentProviderFactory: AgentProviderFactory) {}

  /**
   * Get the Git repository URL from environment variables.
   * @returns The Git repository URL, or undefined if not set
   */
  getGitRepositoryUrl(): string | undefined {
    return process.env.GIT_REPOSITORY_URL;
  }

  /**
   * Get the list of available agent provider types with display names.
   * @returns Array of agent type information objects
   */
  getAvailableAgentTypes(): Array<{ type: string; displayName: string }> {
    return this.agentProviderFactory.getRegisteredTypes().map((type) => {
      const provider = this.agentProviderFactory.getProvider(type);

      return {
        type: provider.getType(),
        displayName: provider.getDisplayName(),
      };
    });
  }
}
