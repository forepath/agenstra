import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { KnowledgeEmbeddingIndexService } from './embeddings/knowledge-embedding-index.service';

@Injectable()
export class KnowledgeEmbeddingIndexScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeEmbeddingIndexScheduler.name);
  private intervalHandle?: NodeJS.Timeout;
  private tickInFlight = false;

  private readonly intervalMs = parseInt(process.env.KNOWLEDGE_EMBEDDINGS_REINDEX_INTERVAL_MS ?? '3600000', 10);

  constructor(private readonly knowledgeEmbeddingIndexService: KnowledgeEmbeddingIndexService) {}

  onModuleInit(): void {
    if (this.intervalMs <= 0) {
      this.logger.log('Knowledge embedding reindex scheduler disabled (KNOWLEDGE_EMBEDDINGS_REINDEX_INTERVAL_MS <= 0)');

      return;
    }

    this.logger.log(`Knowledge embedding reindex scheduler every ${this.intervalMs}ms (first run at startup)`);
    void this.tick();
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
      const result = await this.knowledgeEmbeddingIndexService.reindexAllPages();

      if (result.processed > 0) {
        this.logger.debug(`Knowledge embedding reindex tick processed ${result.processed} page(s)`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Knowledge embedding reindex tick failed: ${message}`, stack);
    } finally {
      this.tickInFlight = false;
    }
  }
}
