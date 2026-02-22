import { SubscriptionStatus } from '../entities/subscription.entity';
import { SubscriptionExpirationScheduler } from './subscription-expiration.scheduler';

describe('SubscriptionExpirationScheduler', () => {
  const subscriptionsRepository = {
    findDueForCancellation: jest.fn(),
    update: jest.fn(),
  } as any;
  const subscriptionItemsRepository = {
    findBySubscription: jest.fn(),
  } as any;
  const serviceTypesRepository = {
    findByIdOrThrow: jest.fn(),
  } as any;
  const provisioningService = {
    deprovision: jest.fn(),
  } as any;

  const scheduler = new SubscriptionExpirationScheduler(
    subscriptionsRepository,
    subscriptionItemsRepository,
    serviceTypesRepository,
    provisioningService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('processes expired subscriptions', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.PENDING_CANCEL },
    ]);
    subscriptionItemsRepository.findBySubscription.mockResolvedValue([
      { id: 'item-1', providerReference: 'server-123', serviceType: { provider: 'hetzner' } },
    ]);
    provisioningService.deprovision.mockResolvedValue(undefined);

    await scheduler.processExpiredSubscriptions();

    expect(provisioningService.deprovision).toHaveBeenCalledWith('hetzner', 'server-123');
    expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', {
      status: SubscriptionStatus.CANCELED,
    });
  });

  it('handles empty expired subscriptions', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([]);

    await scheduler.processExpiredSubscriptions();

    expect(subscriptionsRepository.update).not.toHaveBeenCalled();
  });

  it('continues processing when deprovision fails', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.PENDING_CANCEL },
    ]);
    subscriptionItemsRepository.findBySubscription.mockResolvedValue([
      { id: 'item-1', providerReference: 'server-123', serviceType: { provider: 'hetzner' } },
    ]);
    provisioningService.deprovision.mockRejectedValue(new Error('Deprovision failed'));

    await scheduler.processExpiredSubscriptions();

    expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', {
      status: SubscriptionStatus.CANCELED,
    });
  });

  it('skips items without provider reference', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.PENDING_CANCEL },
    ]);
    subscriptionItemsRepository.findBySubscription.mockResolvedValue([
      { id: 'item-1', providerReference: null, serviceType: { provider: 'hetzner' } },
    ]);

    await scheduler.processExpiredSubscriptions();

    expect(provisioningService.deprovision).not.toHaveBeenCalled();
    expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', {
      status: SubscriptionStatus.CANCELED,
    });
  });

  it('skips items without service type', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.PENDING_CANCEL },
    ]);
    subscriptionItemsRepository.findBySubscription.mockResolvedValue([
      { id: 'item-1', providerReference: 'server-123', serviceType: null },
    ]);

    await scheduler.processExpiredSubscriptions();

    expect(provisioningService.deprovision).not.toHaveBeenCalled();
    expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', {
      status: SubscriptionStatus.CANCELED,
    });
  });
});
