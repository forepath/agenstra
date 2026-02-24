import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InvoiceRefEntity } from '../entities/invoice-ref.entity';
import { InvoiceRefsRepository } from '../repositories/invoice-refs.repository';
import { InvoiceNinjaService } from './invoice-ninja.service';

@Injectable()
export class InvoiceSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceSyncScheduler.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(process.env.INVOICE_SYNC_SCHEDULER_INTERVAL ?? '60000', 10);
  private readonly batchSize = parseInt(process.env.INVOICE_SYNC_SCHEDULER_BATCH_SIZE ?? '100', 10);

  constructor(
    private readonly invoiceRefsRepository: InvoiceRefsRepository,
    private readonly invoiceNinjaService: InvoiceNinjaService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Initializing invoice sync scheduler with ${this.intervalMs}ms interval`);
    this.intervalHandle = setInterval(() => {
      void this.syncInvoicesFromInvoiceNinja();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async syncInvoicesFromInvoiceNinja(): Promise<void> {
    let offset = 0;
    let totalProcessed = 0;

    while (true) {
      const refs = await this.invoiceRefsRepository.findBatchForSync(this.batchSize, offset);
      if (refs.length === 0) {
        break;
      }

      for (const ref of refs) {
        try {
          await this.syncOneInvoiceRef(ref);
          totalProcessed += 1;
        } catch (error) {
          this.logger.error(
            `Failed to sync invoice ref ${ref.id} (invoiceNinjaId=${ref.invoiceNinjaId}): ${(error as Error).message}`,
          );
        }
      }

      offset += refs.length;
      if (refs.length < this.batchSize) {
        break;
      }
    }

    if (totalProcessed > 0) {
      this.logger.log(`Invoice sync completed: ${totalProcessed} refs processed`);
    }
  }

  private async syncOneInvoiceRef(ref: InvoiceRefEntity): Promise<void> {
    const details = await this.invoiceNinjaService.getInvoiceDetailsForSync(ref.invoiceNinjaId);
    if (!details) {
      return;
    }

    const updates: Partial<Pick<InvoiceRefEntity, 'status' | 'invoiceNumber' | 'balance'>> = {};
    if (details.status !== undefined && details.status !== ref.status) {
      updates.status = details.status;
    }
    if (details.invoiceNumber !== undefined && details.invoiceNumber !== ref.invoiceNumber) {
      updates.invoiceNumber = details.invoiceNumber;
    }
    if (details.balance !== undefined && details.balance !== ref.balance) {
      updates.balance = details.balance;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await this.invoiceRefsRepository.update(ref.id, updates);
  }
}
