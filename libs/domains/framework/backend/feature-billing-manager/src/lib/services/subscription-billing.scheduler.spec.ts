import { BillingIntervalType } from '../entities/service-plan.entity';
import { BillingScheduleService } from './billing-schedule.service';
import { SubscriptionBillingScheduler } from './subscription-billing.scheduler';

describe('SubscriptionBillingScheduler', () => {
  const subscriptionsRepository = {
    findDueForBilling: jest.fn(),
    update: jest.fn(),
  } as any;
  const servicePlansRepository = {
    findByIdOrThrow: jest.fn(),
  } as any;
  const serviceTypesRepository = {
    findByIdOrThrow: jest.fn(),
  } as any;
  const billingScheduleService = new BillingScheduleService();
  const openPositionsRepository = {
    create: jest.fn(),
  } as any;

  const scheduler = new SubscriptionBillingScheduler(
    subscriptionsRepository,
    servicePlansRepository,
    serviceTypesRepository,
    billingScheduleService,
    openPositionsRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('processes due subscriptions by creating open position', async () => {
    subscriptionsRepository.findDueForBilling.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'active',
        number: '123456',
      },
    ]);
    servicePlansRepository.findByIdOrThrow.mockResolvedValue({
      id: 'plan-1',
      name: 'Basic Plan',
      billingIntervalType: BillingIntervalType.MONTH,
      billingIntervalValue: 1,
      billingDayOfMonth: undefined,
    });
    openPositionsRepository.create.mockResolvedValue({});

    await scheduler.processDueSubscriptions();

    expect(openPositionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-1',
        userId: 'user-1',
        description: 'Subscription 123456',
        skipIfNoBillableAmount: true,
      }),
    );
    expect(openPositionsRepository.create.mock.calls[0][0].billUntil).toBeInstanceOf(Date);
    expect(subscriptionsRepository.update).toHaveBeenCalled();
  });

  it('handles empty due subscriptions', async () => {
    subscriptionsRepository.findDueForBilling.mockResolvedValue([]);

    await scheduler.processDueSubscriptions();

    expect(openPositionsRepository.create).not.toHaveBeenCalled();
  });

  it('continues processing on individual errors', async () => {
    subscriptionsRepository.findDueForBilling.mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', planId: 'plan-1', number: '123456' },
      { id: 'sub-2', userId: 'user-2', planId: 'plan-2', number: '654321' },
    ]);
    servicePlansRepository.findByIdOrThrow.mockRejectedValueOnce(new Error('Plan not found')).mockResolvedValueOnce({
      id: 'plan-2',
      name: 'Plan 2',
      billingIntervalType: BillingIntervalType.MONTH,
      billingIntervalValue: 1,
    });
    openPositionsRepository.create.mockResolvedValue({});

    await scheduler.processDueSubscriptions();

    expect(openPositionsRepository.create).toHaveBeenCalledTimes(1);
    expect(openPositionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-2',
        userId: 'user-2',
        description: 'Subscription 654321',
        skipIfNoBillableAmount: true,
      }),
    );
  });
});
