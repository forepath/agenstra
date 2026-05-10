import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ContextImportOrchestratorService } from './context-import-orchestrator.service';

@Injectable()
export class ContextImportScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContextImportScheduler.name);
  private intervalHandle?: NodeJS.Timeout;
  private tickInFlight = false;

  private readonly intervalMs = parseInt(process.env.CONTEXT_IMPORT_SCHEDULER_INTERVAL_MS ?? '120000', 10);
  private readonly configBatch = parseInt(process.env.CONTEXT_IMPORT_SCHEDULER_CONFIG_BATCH ?? '3', 10);
  private readonly itemBudget = parseInt(process.env.CONTEXT_IMPORT_ITEM_BUDGET ?? '25', 10);

  constructor(private readonly orchestrator: ContextImportOrchestratorService) {}

  onModuleInit(): void {
    if (this.intervalMs <= 0) {
      this.logger.log('Context import scheduler disabled (CONTEXT_IMPORT_SCHEDULER_INTERVAL_MS <= 0)');

      return;
    }

    this.logger.log(
      `Context import scheduler every ${this.intervalMs}ms, config batch ${this.configBatch}, item budget ${this.itemBudget}`,
    );
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
      const processed = await this.orchestrator.runSchedulerBatch(this.configBatch, this.itemBudget);

      if (processed > 0) {
        this.logger.debug(`Context import scheduler ran ${processed} config(s)`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Context import scheduler tick failed: ${message}`, stack);
    } finally {
      this.tickInFlight = false;
    }
  }
}
