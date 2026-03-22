import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InvoiceCreationService } from './invoice-creation.service';
import { OpenPositionsRepository } from '../repositories/open-positions.repository';
import { UsersBillingDayRepository } from '../repositories/users-billing-day.repository';
import { getTodayBillingDay } from '../utils/billing-day.utils';

@Injectable()
export class OpenPositionInvoiceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenPositionInvoiceScheduler.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(process.env.OPEN_POSITION_INVOICE_SCHEDULER_INTERVAL ?? '86400000', 10);

  constructor(
    private readonly usersBillingDayRepository: UsersBillingDayRepository,
    private readonly openPositionsRepository: OpenPositionsRepository,
    private readonly invoiceCreationService: InvoiceCreationService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Initializing open-position invoice scheduler with ${this.intervalMs}ms interval`);
    this.intervalHandle = setInterval(() => {
      void this.processBillingDayInvoices();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processBillingDayInvoices(): Promise<void> {
    const todayDay = getTodayBillingDay();
    const userIds = await this.usersBillingDayRepository.findUserIdsWithBillingDay(todayDay);

    if (userIds.length === 0) {
      return;
    }

    this.logger.log(`Processing billing day ${todayDay} for ${userIds.length} user(s)`);

    for (const userId of userIds) {
      try {
        await this.processUserOpenPositions(userId);
      } catch (error) {
        this.logger.error(`Failed to process open positions for user ${userId}: ${(error as Error).message}`);
      }
    }
  }

  private async processUserOpenPositions(userId: string): Promise<void> {
    const positions = await this.openPositionsRepository.findUnbilledByUserId(userId);

    if (positions.length === 0) {
      return;
    }

    try {
      const result = await this.invoiceCreationService.createAccumulatedInvoice(userId, positions);

      if (result?.invoiceRefId) {
        this.logger.log(
          `Created accumulated invoice for user ${userId}, ${positions.length} position(s), ref ${result.invoiceRefId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to create accumulated invoice for user ${userId}: ${(error as Error).message}`);
    }
  }
}
