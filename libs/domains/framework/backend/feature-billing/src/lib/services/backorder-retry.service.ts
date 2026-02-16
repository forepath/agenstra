import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BackorderService } from './backorder.service';
import { BackordersRepository } from '../repositories/backorders.repository';

@Injectable()
export class BackorderRetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackorderRetryService.name);
  private intervalHandle?: NodeJS.Timeout;

  constructor(
    private readonly backordersRepository: BackordersRepository,
    private readonly backorderService: BackorderService,
  ) {}

  onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      void this.processPendingBackorders();
    }, 60000);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processPendingBackorders(): Promise<void> {
    const pending = await this.backordersRepository.findAllPending(100, 0);
    for (const backorder of pending) {
      try {
        await this.backorderService.retry(backorder.id);
      } catch (error) {
        this.logger.warn(`Failed to retry backorder ${backorder.id}: ${(error as Error).message}`);
      }
    }
  }
}
