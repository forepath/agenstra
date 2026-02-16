import { BackorderRetryService } from './backorder-retry.service';

describe('BackorderRetryService', () => {
  it('processes pending backorders', async () => {
    const repository = { findAllPending: jest.fn().mockResolvedValue([{ id: 'b1' }]) } as any;
    const backorderService = { retry: jest.fn().mockResolvedValue({}) } as any;
    const service = new BackorderRetryService(repository, backorderService);

    await service.processPendingBackorders();
    expect(backorderService.retry).toHaveBeenCalledWith('b1');
  });
});
