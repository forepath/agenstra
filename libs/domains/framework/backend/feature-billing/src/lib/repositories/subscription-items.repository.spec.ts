import { SubscriptionItemsRepository } from './subscription-items.repository';
import { ProvisioningStatus } from '../entities/subscription-item.entity';

describe('SubscriptionItemsRepository', () => {
  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const repository = new SubscriptionItemsRepository(mockRepository as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates subscription item', async () => {
    const dto = {
      subscriptionId: 'sub-1',
      serviceTypeId: 'stype-1',
      configSnapshot: { region: 'fsn1' },
      provisioningStatus: ProvisioningStatus.PENDING,
    };
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: 'item-1', ...dto });

    const result = await repository.create(dto);

    expect(result.id).toBe('item-1');
  });

  it('updates provider reference', async () => {
    const existing = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      providerReference: null,
    };
    mockRepository.findOne.mockResolvedValue(existing);
    mockRepository.save.mockResolvedValue({ ...existing, providerReference: 'server-123' });

    const result = await repository.updateProviderReference('item-1', 'server-123');

    expect(result.providerReference).toBe('server-123');
  });

  it('throws when item not found for provider reference update', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(repository.updateProviderReference('nonexistent', 'server-123')).rejects.toThrow(
      'Subscription item nonexistent not found',
    );
  });

  it('updates provisioning status', async () => {
    const existing = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      provisioningStatus: ProvisioningStatus.PENDING,
    };
    mockRepository.findOne.mockResolvedValue(existing);
    mockRepository.save.mockResolvedValue({ ...existing, provisioningStatus: ProvisioningStatus.ACTIVE });

    const result = await repository.updateProvisioningStatus('item-1', 'active');

    expect(result.provisioningStatus).toBe(ProvisioningStatus.ACTIVE);
  });

  it('throws when item not found for status update', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(repository.updateProvisioningStatus('nonexistent', 'active')).rejects.toThrow(
      'Subscription item nonexistent not found',
    );
  });

  it('finds items by subscription', async () => {
    const items = [
      { id: 'item-1', subscriptionId: 'sub-1' },
      { id: 'item-2', subscriptionId: 'sub-1' },
    ];
    mockRepository.find.mockResolvedValue(items);

    const result = await repository.findBySubscription('sub-1');

    expect(result).toEqual(items);
    expect(mockRepository.find).toHaveBeenCalledWith({ where: { subscriptionId: 'sub-1' } });
  });
});
