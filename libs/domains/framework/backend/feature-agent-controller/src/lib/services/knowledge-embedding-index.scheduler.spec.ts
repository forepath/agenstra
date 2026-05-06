import { KnowledgeEmbeddingIndexService } from './embeddings/knowledge-embedding-index.service';
import { KnowledgeEmbeddingIndexScheduler } from './knowledge-embedding-index.scheduler';

describe('KnowledgeEmbeddingIndexScheduler', () => {
  const embeddingIndexService = { reindexAllPages: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    embeddingIndexService.reindexAllPages.mockResolvedValue({ processed: 2 });
  });

  function createScheduler(): KnowledgeEmbeddingIndexScheduler {
    return new KnowledgeEmbeddingIndexScheduler(embeddingIndexService as unknown as KnowledgeEmbeddingIndexService);
  }

  it('runs reindexAllPages on tick', async () => {
    const scheduler = createScheduler();

    await scheduler.tick();
    expect(embeddingIndexService.reindexAllPages).toHaveBeenCalledWith();
  });

  it('runs first reindex from onModuleInit before the interval', async () => {
    embeddingIndexService.reindexAllPages.mockResolvedValue({ processed: 0 });
    const scheduler = new KnowledgeEmbeddingIndexScheduler(
      embeddingIndexService as unknown as KnowledgeEmbeddingIndexService,
    );

    scheduler.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    expect(embeddingIndexService.reindexAllPages).toHaveBeenCalled();
    scheduler.onModuleDestroy();
  });

  it('does not overlap ticks while the first is in flight', async () => {
    let release!: (value: { processed: number }) => void;
    const gate = new Promise<{ processed: number }>((resolve) => {
      release = resolve;
    });

    embeddingIndexService.reindexAllPages.mockImplementation(() => gate);
    const scheduler = createScheduler();
    const first = scheduler.tick();
    const second = scheduler.tick();

    expect(embeddingIndexService.reindexAllPages).toHaveBeenCalledTimes(1);
    release({ processed: 0 });
    await first;
    await second;
    expect(embeddingIndexService.reindexAllPages).toHaveBeenCalledTimes(1);
  });

  it('allows a new tick after the previous tick finished', async () => {
    const scheduler = createScheduler();

    await scheduler.tick();
    await scheduler.tick();
    expect(embeddingIndexService.reindexAllPages).toHaveBeenCalledTimes(2);
  });

  it('still clears tickInFlight when reindexAllPages throws', async () => {
    embeddingIndexService.reindexAllPages.mockRejectedValueOnce(new Error('db down'));
    const scheduler = createScheduler();

    await expect(scheduler.tick()).resolves.toBeUndefined();
    embeddingIndexService.reindexAllPages.mockResolvedValue({ processed: 0 });
    await scheduler.tick();
    expect(embeddingIndexService.reindexAllPages).toHaveBeenCalledTimes(2);
  });
});
