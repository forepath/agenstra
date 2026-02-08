import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ClientsRepository } from '../repositories/clients.repository';
import { ClientAgentProxyService } from './client-agent-proxy.service';

/**
 * Service for proxying OpenClaw gateway traffic to AGI agent containers.
 * Builds the target URL and validates agent type.
 */
@Injectable()
export class ClientAgentOpenClawProxyService {
  private readonly logger = new Logger(ClientAgentOpenClawProxyService.name);

  constructor(
    private readonly clientAgentProxyService: ClientAgentProxyService,
    private readonly clientsRepository: ClientsRepository,
  ) {}

  /**
   * Get the OpenClaw gateway target URL for an AGI agent.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @returns The full URL to the OpenClaw gateway (e.g. http://manager-host:18789)
   * @throws NotFoundException if agent is not found or not AGI type
   * @throws BadRequestException if agent has no OpenClaw port
   */
  async getOpenClawTargetUrl(clientId: string, agentId: string): Promise<string> {
    const agent = await this.clientAgentProxyService.getClientAgent(clientId, agentId);

    if (agent.agentType !== 'agi') {
      throw new BadRequestException(
        `Agent ${agentId} is not an AGI agent. OpenClaw proxy is only available for AGI agents.`,
      );
    }

    if (!agent.openclaw?.port) {
      throw new BadRequestException(
        `Agent ${agentId} has no OpenClaw port configured. The AGI container may not be running.`,
      );
    }

    const clientEntity = await this.clientsRepository.findByIdOrThrow(clientId);
    const targetUrl = this.buildOpenClawUrlFromEndpoint(clientEntity.endpoint, agent.openclaw.port);

    this.logger.debug(`OpenClaw target URL for agent ${agentId}: ${targetUrl}`);

    return targetUrl;
  }

  /**
   * Build the OpenClaw gateway URL from the client endpoint and OpenClaw port.
   * Uses the same host as the agent-manager endpoint but with the OpenClaw port.
   * @param endpoint - The client's agent-manager endpoint (e.g. https://manager.example.com:3000)
   * @param openclawPort - The host port where OpenClaw gateway is exposed
   * @returns The OpenClaw gateway URL (e.g. http://manager.example.com:18789)
   */
  private buildOpenClawUrlFromEndpoint(endpoint: string, openclawPort: number): string {
    try {
      const url = new URL(endpoint);
      const protocol = url.protocol === 'https:' ? 'https' : 'http';
      return `${protocol}://${url.hostname}:${openclawPort}`;
    } catch {
      this.logger.warn(`Invalid endpoint URL: ${endpoint}`);
      throw new BadRequestException(`Invalid client endpoint: ${endpoint}`);
    }
  }
}
