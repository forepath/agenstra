import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BackordersRepository } from '../repositories/backorders.repository';
import { BackorderService } from './backorder.service';

@Injectable()
export class BackorderRetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackorderRetryService.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(process.env.BACKORDER_RETRY_INTERVAL_MS ?? '60000', 10);
  private readonly batchSize = parseInt(process.env.BACKORDER_RETRY_BATCH_SIZE ?? '100', 10);

  constructor(
    private readonly backordersRepository: BackordersRepository,
    private readonly backorderService: BackorderService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Initializing billing scheduler with ${this.intervalMs}ms interval`);
    this.intervalHandle = setInterval(() => {
      void this.processPendingBackorders();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processPendingBackorders(): Promise<void> {
    const pending = await this.backordersRepository.findAllPending(this.batchSize, 0);

    if (pending.length === 0) {
      return;
    }

    this.logger.log(`Processing ${pending.length} pending backorders`);

    for (const backorder of pending) {
      try {
        await this.backorderService.retry(backorder.id);
      } catch (error) {
        this.logger.error(`Failed to retry backorder ${backorder.id}: ${(error as Error).message}`);
      }
    }
  }
}
