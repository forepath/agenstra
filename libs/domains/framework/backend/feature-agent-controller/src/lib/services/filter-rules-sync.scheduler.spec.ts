import { FilterRulesService } from './filter-rules.service';
import { FilterRulesSyncService } from './filter-rules-sync.service';
import { FilterRulesSyncScheduler } from './filter-rules-sync.scheduler';

describe('FilterRulesSyncScheduler', () => {
  const syncService = { processBatch: jest.fn() };
  const filterRulesService = { reconcileAllGlobalRules: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    syncService.processBatch.mockResolvedValue(0);
    filterRulesService.reconcileAllGlobalRules.mockResolvedValue(undefined);
  });

  function createScheduler(): FilterRulesSyncScheduler {
    return new FilterRulesSyncScheduler(
      syncService as unknown as FilterRulesSyncService,
      filterRulesService as unknown as FilterRulesService,
    );
  }

  it('runs processBatch then reconcileAllGlobalRules on tick', async () => {
    syncService.processBatch.mockResolvedValue(3);
    const scheduler = createScheduler();
    await scheduler.tick();
    expect(syncService.processBatch).toHaveBeenCalled();
    expect(filterRulesService.reconcileAllGlobalRules).toHaveBeenCalled();
  });

  it('does not overlap ticks while the first is in flight', async () => {
    let release: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    syncService.processBatch.mockImplementation(() => gate);
    const scheduler = createScheduler();
    const first = scheduler.tick();
    const second = scheduler.tick();
    expect(syncService.processBatch).toHaveBeenCalledTimes(1);
    release!();
    await first;
    await second;
    expect(syncService.processBatch).toHaveBeenCalledTimes(1);
  });

  it('allows a new tick after the previous tick finished', async () => {
    const scheduler = createScheduler();
    await scheduler.tick();
    await scheduler.tick();
    expect(syncService.processBatch).toHaveBeenCalledTimes(2);
  });

  it('still clears tickInFlight when processBatch throws', async () => {
    syncService.processBatch.mockRejectedValueOnce(new Error('db down'));
    const scheduler = createScheduler();
    await expect(scheduler.tick()).resolves.toBeUndefined();
    syncService.processBatch.mockResolvedValue(0);
    await scheduler.tick();
    expect(syncService.processBatch).toHaveBeenCalledTimes(2);
  });
});
