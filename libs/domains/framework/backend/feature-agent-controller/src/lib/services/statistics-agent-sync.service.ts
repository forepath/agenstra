import { Injectable, Logger } from '@nestjs/common';
import { AuthenticationType } from '../entities/client.entity';
import { ClientAgentProxyService } from './client-agent-proxy.service';
import { ClientsRepository } from '../repositories/clients.repository';
import { StatisticsRepository } from '../repositories/statistics.repository';

const AGENTS_BATCH_SIZE = 50;

/**
 * Syncs agents from each client's agent-manager to the statistics_agents mirror table on container startup.
 * Creates mirror entries that do not exist and updates existing mirrors.
 * Runs after client sync. Skips clients whose agent-manager is unreachable (e.g. offline).
 */
@Injectable()
export class StatisticsAgentSyncService {
  private readonly logger = new Logger(StatisticsAgentSyncService.name);

  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly statisticsRepository: StatisticsRepository,
    private readonly clientAgentProxyService: ClientAgentProxyService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      this.logger.log('🔄 Syncing agents to statistics mirror table...');
      const clients = await this.clientsRepository.findAllForStatisticsSync();
      let totalAgents = 0;
      for (const client of clients) {
        try {
          const statsClient = await this.statisticsRepository.upsertStatisticsClient(client.id, {
            name: client.name,
            endpoint: client.endpoint,
            authenticationType: client.authenticationType as AuthenticationType,
          });
          const count = await this.syncAgentsForClient(client.id, statsClient.id);
          totalAgents += count;
        } catch (error) {
          this.logger.warn(
            `⚠️ Skipped agent sync for client ${client.id} (${client.name}): ${error instanceof Error ? error.message : error}`,
          );
        }
      }
      this.logger.log(
        `✅ Statistics agent sync completed: ${totalAgents} agent(s) synced across ${clients.length} client(s)`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to sync agents to statistics mirror table:', error);
      throw error;
    }
  }

  private async syncAgentsForClient(clientId: string, statisticsClientId: string): Promise<number> {
    let offset = 0;
    let total = 0;
    let batch: Awaited<ReturnType<ClientAgentProxyService['getClientAgents']>>;
    do {
      batch = await this.clientAgentProxyService.getClientAgents(clientId, AGENTS_BATCH_SIZE, offset);
      for (const agent of batch) {
        await this.statisticsRepository.upsertStatisticsAgent(agent.id, statisticsClientId, {
          agentType: agent.agentType ?? 'cursor',
          containerType: agent.containerType?.toString() ?? 'generic',
          name: agent.name,
          description: agent.description,
        });
        total++;
      }
      offset += AGENTS_BATCH_SIZE;
    } while (batch.length === AGENTS_BATCH_SIZE);
    return total;
  }
}
