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
  const provisioningService = {
    deprovision: jest.fn(),
  } as any;
  const openPositionsRepository = {
    create: jest.fn(),
  } as any;
  const hostnameReservationService = {
    releaseHostname: jest.fn().mockResolvedValue(undefined),
  } as any;
  const cloudflareDnsService = {
    deleteRecord: jest.fn().mockResolvedValue(undefined),
  } as any;

  const scheduler = new SubscriptionExpirationScheduler(
    subscriptionsRepository,
    subscriptionItemsRepository,
    provisioningService,
    openPositionsRepository,
    hostnameReservationService,
    cloudflareDnsService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('processes expired subscriptions by creating open position', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', status: SubscriptionStatus.PENDING_CANCEL, number: '123456' },
    ]);
    subscriptionItemsRepository.findBySubscription.mockResolvedValue([
      { id: 'item-1', providerReference: 'server-123', serviceType: { provider: 'hetzner' } },
    ]);
    provisioningService.deprovision.mockResolvedValue(undefined);
    openPositionsRepository.create.mockResolvedValue(undefined);

    await scheduler.processExpiredSubscriptions();

    expect(provisioningService.deprovision).toHaveBeenCalledWith('hetzner', 'server-123');
    expect(openPositionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-1',
        userId: 'user-1',
        description: expect.stringContaining('Subscription'),
        skipIfNoBillableAmount: true,
      }),
    );
    expect(openPositionsRepository.create.mock.calls[0][0].billUntil).toBeInstanceOf(Date);
    expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', {
      status: SubscriptionStatus.CANCELED,
    });
  });

  it('handles empty expired subscriptions', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([]);

    await scheduler.processExpiredSubscriptions();

    expect(openPositionsRepository.create).not.toHaveBeenCalled();
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

  it('removes DNS record and releases hostname when item has hostname', async () => {
    subscriptionsRepository.findDueForCancellation.mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', status: SubscriptionStatus.PENDING_CANCEL, number: '123456' },
    ]);
    subscriptionItemsRepository.findBySubscription.mockResolvedValue([
      {
        id: 'item-1',
        hostname: 'awesome-armadillo-abc12',
        providerReference: 'server-123',
        serviceType: { provider: 'hetzner' },
      },
    ]);
    provisioningService.deprovision.mockResolvedValue(undefined);
    openPositionsRepository.create.mockResolvedValue(undefined);

    await scheduler.processExpiredSubscriptions();

    expect(cloudflareDnsService.deleteRecord).toHaveBeenCalledWith('awesome-armadillo-abc12');
    expect(hostnameReservationService.releaseHostname).toHaveBeenCalledWith('item-1');
    expect(provisioningService.deprovision).toHaveBeenCalledWith('hetzner', 'server-123');
  });
});
