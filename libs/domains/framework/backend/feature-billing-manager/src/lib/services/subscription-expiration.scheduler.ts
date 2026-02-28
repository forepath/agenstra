import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubscriptionEntity, SubscriptionStatus } from '../entities/subscription.entity';
import { OpenPositionsRepository } from '../repositories/open-positions.repository';
import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { CloudflareDnsService } from './cloudflare-dns.service';
import { HostnameReservationService } from './hostname-reservation.service';
import { ProvisioningService } from './provisioning.service';

@Injectable()
export class SubscriptionExpirationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionExpirationScheduler.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(process.env.EXPIRATION_SCHEDULER_INTERVAL ?? '60000', 10);
  private readonly batchSize = parseInt(process.env.EXPIRATION_SCHEDULER_BATCH_SIZE ?? '100', 10);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionItemsRepository: SubscriptionItemsRepository,
    private readonly provisioningService: ProvisioningService,
    private readonly openPositionsRepository: OpenPositionsRepository,
    private readonly hostnameReservationService: HostnameReservationService,
    private readonly cloudflareDnsService: CloudflareDnsService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Initializing expiration scheduler with ${this.intervalMs}ms interval`);
    this.intervalHandle = setInterval(() => {
      void this.processExpiredSubscriptions();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    const expiredSubscriptions = await this.subscriptionsRepository.findDueForCancellation(now, this.batchSize);

    if (expiredSubscriptions.length === 0) {
      return;
    }

    this.logger.log(`Processing ${expiredSubscriptions.length} subscriptions due for cancellation`);

    for (const subscription of expiredSubscriptions) {
      try {
        await this.processSubscriptionCancellation(subscription);
      } catch (error) {
        this.logger.error(`Failed to cancel subscription ${subscription.id}: ${(error as Error).message}`);
      }
    }
  }

  private async processSubscriptionCancellation(subscription: SubscriptionEntity): Promise<void> {
    const items = await this.subscriptionItemsRepository.findBySubscription(subscription.id);
    this.logger.log(`Found ${items.length} items for subscription ${subscription.id}`);

    for (const item of items) {
      if (item.hostname) {
        try {
          await this.cloudflareDnsService.deleteRecord(item.hostname);
        } catch (error) {
          this.logger.warn(
            `Failed to remove DNS record for ${item.hostname} (subscription ${subscription.id}): ${(error as Error).message}`,
          );
        }
        try {
          await this.hostnameReservationService.releaseHostname(item.id);
        } catch (error) {
          this.logger.warn(`Failed to release hostname for item ${item.id}: ${(error as Error).message}`);
        }
      }
      if (item.providerReference && item.serviceType?.provider) {
        this.logger.log(`Deprovisioning resource ${item.providerReference} for subscription ${subscription.id}`);
        try {
          await this.provisioningService.deprovision(item.serviceType.provider, item.providerReference);
          this.logger.log(`Deprovisioned resource ${item.providerReference} for subscription ${subscription.id}`);
        } catch (error) {
          this.logger.warn(
            `Failed to deprovision resource ${item.providerReference} for subscription ${subscription.id}: ${(error as Error).message}`,
          );
        }
      }
    }

    const cancelEffectiveAt = subscription.cancelEffectiveAt ?? new Date();

    try {
      await this.openPositionsRepository.create({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        description: `Subscription ${subscription.number}`,
        billUntil: cancelEffectiveAt,
        skipIfNoBillableAmount: true,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record open position for subscription ${subscription.id}: ${(error as Error).message}`,
      );
    }

    await this.subscriptionsRepository.update(subscription.id, {
      status: SubscriptionStatus.CANCELED,
    });

    this.logger.log(`Canceled subscription ${subscription.id}`);
  }
}
