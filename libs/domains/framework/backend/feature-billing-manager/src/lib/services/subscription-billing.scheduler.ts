import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { ServiceTypesRepository } from '../repositories/service-types.repository';
import { BillingScheduleService } from './billing-schedule.service';
import { InvoiceCreationService } from './invoice-creation.service';
import { BillingIntervalType } from '../entities/service-plan.entity';

@Injectable()
export class SubscriptionBillingScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionBillingScheduler.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(process.env.BILLING_SCHEDULER_INTERVAL ?? '60000', 10);
  private readonly batchSize = parseInt(process.env.BILLING_SCHEDULER_BATCH_SIZE ?? '100', 10);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly serviceTypesRepository: ServiceTypesRepository,
    private readonly billingScheduleService: BillingScheduleService,
    private readonly invoiceCreationService: InvoiceCreationService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Initializing billing scheduler with ${this.intervalMs}ms interval`);
    this.intervalHandle = setInterval(() => {
      void this.processDueSubscriptions();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processDueSubscriptions(): Promise<void> {
    const now = new Date();
    const dueSubscriptions = await this.subscriptionsRepository.findDueForBilling(now, this.batchSize);

    if (dueSubscriptions.length === 0) {
      return;
    }

    this.logger.log(`Processing ${dueSubscriptions.length} subscriptions due for billing`);

    for (const subscription of dueSubscriptions) {
      try {
        await this.processSubscriptionBilling(subscription);
      } catch (error) {
        this.logger.error(`Failed to bill subscription ${subscription.id}: ${(error as Error).message}`);
      }
    }
  }

  private async processSubscriptionBilling(subscription: SubscriptionEntity): Promise<void> {
    const plan = await this.servicePlansRepository.findByIdOrThrow(subscription.planId);

    await this.invoiceCreationService.createInvoice(
      subscription.id,
      subscription.userId,
      `Recurring billing for ${plan.name}`,
      {
        billUntil: subscription.nextBillingAt ?? new Date(),
        skipIfNoBillableAmount: true,
      },
    );

    const schedule = this.billingScheduleService.calculateSchedule(
      plan.billingIntervalType as BillingIntervalType,
      plan.billingIntervalValue,
      plan.billingDayOfMonth,
    );

    await this.subscriptionsRepository.update(subscription.id, {
      currentPeriodStart: schedule.currentPeriodStart,
      currentPeriodEnd: schedule.currentPeriodEnd,
      nextBillingAt: schedule.nextBillingAt,
    });

    this.logger.log(`Billed subscription ${subscription.id}, next billing at ${schedule.nextBillingAt.toISOString()}`);
  }
}
