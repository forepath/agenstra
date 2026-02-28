import { BackorderService } from './backorder.service';

describe('BackorderService', () => {
  const hostnameReservationService = {
    reserveHostname: jest.fn().mockResolvedValue('awesome-armadillo-abc12'),
    releaseHostname: jest.fn().mockResolvedValue(undefined),
  } as any;
  const cloudflareDnsService = {
    createARecord: jest.fn().mockResolvedValue(undefined),
  } as any;

  it('creates backorder', async () => {
    const repository = { create: jest.fn().mockResolvedValue({ id: 'b1' }) } as any;
    const service = new BackorderService(
      repository,
      { checkAvailability: jest.fn().mockResolvedValue({ isAvailable: true }) } as any,
      { findByIdOrThrow: jest.fn() } as any,
      { findByIdOrThrow: jest.fn() } as any,
      { create: jest.fn().mockResolvedValue({ id: 'sub-1' }) } as any,
      {
        create: jest.fn().mockResolvedValue({ id: 'item-1' }),
        updateProviderReference: jest.fn(),
        updateProvisioningStatus: jest.fn(),
      } as any,
      {
        calculateSchedule: jest.fn().mockReturnValue({
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          nextBillingAt: new Date(),
        }),
      } as any,
      { provision: jest.fn().mockResolvedValue({ serverId: 'srv-1' }) } as any,
      hostnameReservationService,
      cloudflareDnsService,
    );
    const result = await service.create({
      userId: 'u1',
      serviceTypeId: 's1',
      planId: 'p1',
      requestedConfigSnapshot: {},
    });
    expect(result.id).toBe('b1');
  });

  it('updates provider reference on retry', async () => {
    const backordersRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'b1',
        userId: 'u1',
        planId: 'p1',
        serviceTypeId: 's1',
        requestedConfigSnapshot: { region: 'fsn1', serverType: 'cx11' },
      }),
      update: jest.fn().mockResolvedValue({ id: 'b1' }),
    } as any;
    const subscriptionItemsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'item-1' }),
      updateProviderReference: jest.fn(),
      updateProvisioningStatus: jest.fn(),
      updateHostname: jest.fn().mockResolvedValue({}),
    } as any;
    const provisioningService = {
      provision: jest.fn().mockResolvedValue({ serverId: 'srv-1' }),
      getServerInfo: jest.fn().mockResolvedValue({ publicIp: '1.2.3.4' }),
    } as any;
    const service = new BackorderService(
      backordersRepository,
      { checkAvailability: jest.fn().mockResolvedValue({ isAvailable: true }) } as any,
      { findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'p1', serviceTypeId: 's1' }) } as any,
      { findByIdOrThrow: jest.fn().mockResolvedValue({ id: 's1', provider: 'hetzner' }) } as any,
      { create: jest.fn().mockResolvedValue({ id: 'sub-1' }) } as any,
      subscriptionItemsRepository,
      {
        calculateSchedule: jest.fn().mockReturnValue({
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          nextBillingAt: new Date(),
        }),
      } as any,
      provisioningService,
      hostnameReservationService,
      cloudflareDnsService,
    );

    await service.retry('b1');
    expect(hostnameReservationService.reserveHostname).toHaveBeenCalledWith('item-1');
    expect(provisioningService.provision).toHaveBeenCalledWith(
      'hetzner',
      expect.objectContaining({ name: 'awesome-armadillo-abc12' }),
    );
    expect(subscriptionItemsRepository.updateProviderReference).toHaveBeenCalledWith('item-1', 'srv-1');
    expect(provisioningService.getServerInfo).toHaveBeenCalledWith('hetzner', 'srv-1');
    expect(cloudflareDnsService.createARecord).toHaveBeenCalledWith('awesome-armadillo-abc12', '1.2.3.4');
  });
});
