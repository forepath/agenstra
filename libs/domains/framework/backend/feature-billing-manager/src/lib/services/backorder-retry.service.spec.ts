import { BackorderRetryService } from './backorder-retry.service';

describe('BackorderRetryService', () => {
  const backordersRepository = {
    findAllPending: jest.fn(),
  } as any;
  const backorderService = {
    retry: jest.fn(),
  } as any;

  let service: BackorderRetryService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BackorderRetryService(backordersRepository, backorderService);
  });

  it('processes pending backorders', async () => {
    backordersRepository.findAllPending.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
    backorderService.retry.mockResolvedValue({});

    await service.processPendingBackorders();

    expect(backorderService.retry).toHaveBeenCalledWith('b1');
    expect(backorderService.retry).toHaveBeenCalledWith('b2');
  });

  it('handles empty pending backorders', async () => {
    backordersRepository.findAllPending.mockResolvedValue([]);

    await service.processPendingBackorders();

    expect(backorderService.retry).not.toHaveBeenCalled();
  });

  it('continues processing on individual errors', async () => {
    backordersRepository.findAllPending.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
    backorderService.retry.mockRejectedValueOnce(new Error('Retry failed')).mockResolvedValueOnce({});

    await service.processPendingBackorders();

    expect(backorderService.retry).toHaveBeenCalledTimes(2);
  });
});
