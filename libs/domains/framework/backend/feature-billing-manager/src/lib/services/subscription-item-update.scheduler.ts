import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';
import { buildAgentControllerUpdateCommand } from '../utils/cloud-init/agent-controller.utils';
import { buildAgentManagerUpdateCommand } from '../utils/cloud-init/agent-manager.utils';

import { ProvisioningService } from './provisioning.service';
import { SshExecutorService } from './ssh-executor.service';

const DEFAULT_INTERVAL_MS = 86400000; // 24 hours
const SSH_USER = 'root';
const SSH_PORT = 22;

@Injectable()
export class SubscriptionItemUpdateScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionItemUpdateScheduler.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(
    process.env.SUBSCRIPTION_UPDATE_SCHEDULER_INTERVAL ?? String(DEFAULT_INTERVAL_MS),
    10,
  );

  constructor(
    private readonly subscriptionItemsRepository: SubscriptionItemsRepository,
    private readonly provisioningService: ProvisioningService,
    private readonly sshExecutor: SshExecutorService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Initializing subscription item update scheduler with ${this.intervalMs}ms interval`);
    this.intervalHandle = setInterval(() => {
      void this.runUpdateCycle();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async runUpdateCycle(): Promise<void> {
    const items = await this.subscriptionItemsRepository.findProvisionedWithSshKey();

    if (items.length === 0) {
      return;
    }

    this.logger.log(`Running update cycle for ${items.length} provisioned item(s)`);

    for (const item of items) {
      try {
        await this.updateItem(item);
      } catch (error) {
        this.logger.error(
          `Update failed for subscription item ${item.id} (${item.subscription?.number ?? item.subscriptionId}): ${(error as Error).message}`,
        );
      }
    }
  }

  private async updateItem(item: {
    id: string;
    subscriptionId: string;
    providerReference?: string;
    sshPrivateKey?: string;
    serviceType?: { provider?: string };
    configSnapshot?: Record<string, unknown>;
  }): Promise<void> {
    const provider = item.serviceType?.provider;

    if (!provider || !item.providerReference || !item.sshPrivateKey) {
      return;
    }

    const serverInfo = await this.provisioningService.getServerInfo(provider, item.providerReference);

    if (!serverInfo?.publicIp) {
      this.logger.warn(`No public IP for item ${item.id}, skipping update`);

      return;
    }

    const service = (item.configSnapshot?.service as string) ?? 'controller';
    const command = service === 'manager' ? buildAgentManagerUpdateCommand() : buildAgentControllerUpdateCommand();
    const result = await this.sshExecutor.exec(serverInfo.publicIp, SSH_PORT, SSH_USER, item.sshPrivateKey, command);

    if (result.code !== 0) {
      this.logger.error(
        `Update command failed for item ${item.id} (exit code ${result.code}): stderr=${result.stderr.slice(0, 500)}`,
      );
    } else {
      this.logger.log(`Update completed for subscription item ${item.id}`);
    }
  }
}
