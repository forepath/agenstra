import { Test, TestingModule } from '@nestjs/testing';
import { AutonomousRunOrchestratorService } from './autonomous-run-orchestrator.service';
import { AutonomousTicketScheduler } from './autonomous-ticket.scheduler';

describe('AutonomousTicketScheduler', () => {
  it('invokes orchestrator on tick', async () => {
    const orchestrator = { processBatch: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutonomousTicketScheduler, { provide: AutonomousRunOrchestratorService, useValue: orchestrator }],
    }).compile();
    const scheduler = module.get(AutonomousTicketScheduler);
    await scheduler.tick();
    expect(orchestrator.processBatch).toHaveBeenCalled();
    await module.close();
  });

  it('does not start a second tick while the first is still in flight', async () => {
    let releaseBatch: () => void;
    const batchGate = new Promise<void>((resolve) => {
      releaseBatch = resolve;
    });
    const orchestrator = {
      processBatch: jest.fn().mockImplementation(() => batchGate),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutonomousTicketScheduler, { provide: AutonomousRunOrchestratorService, useValue: orchestrator }],
    }).compile();
    const scheduler = module.get(AutonomousTicketScheduler);
    const first = scheduler.tick();
    const second = scheduler.tick();
    expect(orchestrator.processBatch).toHaveBeenCalledTimes(1);
    releaseBatch!();
    await first;
    await second;
    expect(orchestrator.processBatch).toHaveBeenCalledTimes(1);
    await module.close();
  });

  it('runs another tick after the previous one finished', async () => {
    const orchestrator = { processBatch: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutonomousTicketScheduler, { provide: AutonomousRunOrchestratorService, useValue: orchestrator }],
    }).compile();
    const scheduler = module.get(AutonomousTicketScheduler);
    await scheduler.tick();
    await scheduler.tick();
    expect(orchestrator.processBatch).toHaveBeenCalledTimes(2);
    await module.close();
  });
});
