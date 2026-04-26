import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { FilterRulesSyncService } from './filter-rules-sync.service';
import { FilterRulesService } from './filter-rules.service';

@Injectable()
export class FilterRulesSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilterRulesSyncScheduler.name);
  private intervalHandle?: NodeJS.Timeout;
  private tickInFlight = false;

  private readonly intervalMs = parseInt(process.env.FILTER_RULES_SYNC_INTERVAL_MS ?? '30000', 10);
  private readonly batchSize = parseInt(process.env.FILTER_RULES_SYNC_BATCH_SIZE ?? '10', 10);

  constructor(
    private readonly syncService: FilterRulesSyncService,
    private readonly filterRulesService: FilterRulesService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Filter rules sync scheduler every ${this.intervalMs}ms, batch ${this.batchSize}`);
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async tick(): Promise<void> {
    if (this.tickInFlight) {
      return;
    }

    this.tickInFlight = true;

    try {
      const n = await this.syncService.processBatch(this.batchSize);

      if (n > 0) {
        this.logger.debug(`Processed ${n} filter-rule sync targets`);
      }

      await this.filterRulesService.reconcileAllGlobalRules();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Filter rules sync tick failed: ${message}`, stack);
    } finally {
      this.tickInFlight = false;
    }
  }
}
