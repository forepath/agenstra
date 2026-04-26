import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { AutonomousRunOrchestratorService } from './autonomous-run-orchestrator.service';

@Injectable()
export class AutonomousTicketScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutonomousTicketScheduler.name);
  private intervalHandle?: NodeJS.Timeout;
  /** Avoid overlapping ticks when a batch outlasts the interval. */
  private tickInFlight = false;

  private readonly intervalMs = parseInt(process.env.AUTONOMOUS_TICKET_SCHEDULER_INTERVAL_MS ?? '60000', 10);
  private readonly batchSize = parseInt(process.env.AUTONOMOUS_TICKET_SCHEDULER_BATCH_SIZE ?? '5', 10);

  constructor(private readonly orchestrator: AutonomousRunOrchestratorService) {}

  onModuleInit(): void {
    this.logger.log(`Autonomous ticket scheduler every ${this.intervalMs}ms, batch ${this.batchSize}`);
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
      await this.orchestrator.processBatch(this.batchSize);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Autonomous ticket scheduler tick failed: ${message}`, stack);
    } finally {
      this.tickInFlight = false;
    }
  }
}
