import { BadRequestException } from '@nestjs/common';
import { BillingScheduleService } from './billing-schedule.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import { AvailabilityService } from './availability.service';
import { BackorderService } from './backorder.service';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { ServiceTypesRepository } from '../repositories/service-types.repository';
import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { SubscriptionService } from './subscription.service';
import { BillingIntervalType } from '../entities/service-plan.entity';
import { SubscriptionStatus } from '../entities/subscription.entity';

describe('SubscriptionService', () => {
  const plansRepository = {
    findByIdOrThrow: jest.fn(),
  } as unknown as ServicePlansRepository;
  const typesRepository = {
    findByIdOrThrow: jest.fn(),
  } as unknown as ServiceTypesRepository;
  const subscriptionsRepository = {
    create: jest.fn(),
    findByIdOrThrow: jest.fn(),
    update: jest.fn(),
    findAllByUser: jest.fn(),
  } as unknown as SubscriptionsRepository;
  const itemsRepository = {
    create: jest.fn(),
    updateProviderReference: jest.fn(),
    updateProvisioningStatus: jest.fn(),
  } as unknown as SubscriptionItemsRepository;
  const scheduleService = new BillingScheduleService();
  const cancellationPolicyService = new CancellationPolicyService();
  const backorderService = {
    create: jest.fn(),
  } as unknown as BackorderService;
  const availabilityService = {
    checkAvailability: jest.fn(),
  } as unknown as AvailabilityService;
  const provisioningService = { provision: jest.fn() } as any;

  const service = new SubscriptionService(
    plansRepository,
    typesRepository,
    subscriptionsRepository,
    itemsRepository,
    scheduleService,
    cancellationPolicyService,
    backorderService,
    availabilityService,
    provisioningService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates subscription with schedule', async () => {
    plansRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
      id: 'plan-1',
      serviceTypeId: 'stype-1',
      billingIntervalType: BillingIntervalType.DAY,
      billingIntervalValue: 1,
      billingDayOfMonth: undefined,
    });
    typesRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
      id: 'stype-1',
      provider: 'hetzner',
      configSchema: { required: ['region'] },
    });
    subscriptionsRepository.create = jest.fn().mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      status: SubscriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    itemsRepository.create = jest.fn().mockResolvedValue({ id: 'item-1' });
    itemsRepository.updateProviderReference = jest.fn();
    itemsRepository.updateProvisioningStatus = jest.fn();
    (availabilityService.checkAvailability as jest.Mock).mockResolvedValue({ isAvailable: true });
    (provisioningService.provision as jest.Mock).mockResolvedValue({ serverId: 'srv-1' });

    const result = await service.createSubscription('user-1', 'plan-1', { region: 'fsn1' });
    expect(result.id).toBe('sub-1');
    expect(subscriptionsRepository.create).toHaveBeenCalled();
    expect(itemsRepository.create).toHaveBeenCalled();
    expect(provisioningService.provision).toHaveBeenCalled();
    expect(itemsRepository.updateProviderReference).toHaveBeenCalledWith('item-1', 'srv-1');
  });

  it('rejects cancel when policy disallows', async () => {
    subscriptionsRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      createdAt: new Date(),
      currentPeriodEnd: new Date(),
      status: SubscriptionStatus.ACTIVE,
    });
    plansRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
      id: 'plan-1',
      cancelAtPeriodEnd: true,
      minCommitmentDays: 10,
      noticeDays: 0,
    });

    await expect(service.cancelSubscription('sub-1', 'user-1')).rejects.toThrow(BadRequestException);
  });
});
