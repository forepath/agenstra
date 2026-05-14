import { ContextImportOrchestratorService } from './context-import-orchestrator.service';
import { ContextImportScheduler } from './context-import.scheduler';

describe('ContextImportScheduler', () => {
  const orchestrator = { runSchedulerBatch: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator.runSchedulerBatch.mockResolvedValue(1);
  });

  function createScheduler(): ContextImportScheduler {
    return new ContextImportScheduler(orchestrator as unknown as ContextImportOrchestratorService);
  }

  it('tick delegates to orchestrator.runSchedulerBatch', async () => {
    const scheduler = createScheduler();

    await scheduler.tick();

    expect(orchestrator.runSchedulerBatch).toHaveBeenCalled();
  });

  it('does not overlap ticks while the first is in flight', async () => {
    let release: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    orchestrator.runSchedulerBatch.mockImplementation(() => gate);
    const scheduler = createScheduler();
    const first = scheduler.tick();
    const second = scheduler.tick();

    expect(orchestrator.runSchedulerBatch).toHaveBeenCalledTimes(1);
    release!();
    await first;
    await second;
    expect(orchestrator.runSchedulerBatch).toHaveBeenCalledTimes(1);
  });

  it('allows a new tick after the previous tick finished', async () => {
    const scheduler = createScheduler();

    await scheduler.tick();
    await scheduler.tick();
    expect(orchestrator.runSchedulerBatch).toHaveBeenCalledTimes(2);
  });
});
