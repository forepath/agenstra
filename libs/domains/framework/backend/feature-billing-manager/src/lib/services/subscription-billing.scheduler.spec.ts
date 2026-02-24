import { BillingScheduleService } from './billing-schedule.service';
import { SubscriptionBillingScheduler } from './subscription-billing.scheduler';
import { BillingIntervalType } from '../entities/service-plan.entity';

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
  const invoiceCreationService = {
    createInvoice: jest.fn(),
  } as any;

  const scheduler = new SubscriptionBillingScheduler(
    subscriptionsRepository,
    servicePlansRepository,
    serviceTypesRepository,
    billingScheduleService,
    invoiceCreationService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('processes due subscriptions', async () => {
    subscriptionsRepository.findDueForBilling.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'active',
      },
    ]);
    servicePlansRepository.findByIdOrThrow.mockResolvedValue({
      id: 'plan-1',
      name: 'Basic Plan',
      billingIntervalType: BillingIntervalType.MONTH,
      billingIntervalValue: 1,
      billingDayOfMonth: undefined,
    });
    invoiceCreationService.createInvoice.mockResolvedValue({});

    await scheduler.processDueSubscriptions();

    expect(invoiceCreationService.createInvoice).toHaveBeenCalledWith(
      'sub-1',
      'user-1',
      'Recurring billing for Basic Plan',
      expect.objectContaining({
        billUntil: expect.any(Date),
        skipIfNoBillableAmount: true,
      }),
    );
    expect(subscriptionsRepository.update).toHaveBeenCalled();
  });

  it('handles empty due subscriptions', async () => {
    subscriptionsRepository.findDueForBilling.mockResolvedValue([]);

    await scheduler.processDueSubscriptions();

    expect(invoiceCreationService.createInvoice).not.toHaveBeenCalled();
  });

  it('continues processing on individual errors', async () => {
    subscriptionsRepository.findDueForBilling.mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', planId: 'plan-1' },
      { id: 'sub-2', userId: 'user-2', planId: 'plan-2' },
    ]);
    servicePlansRepository.findByIdOrThrow.mockRejectedValueOnce(new Error('Plan not found')).mockResolvedValueOnce({
      id: 'plan-2',
      name: 'Plan 2',
      billingIntervalType: BillingIntervalType.MONTH,
      billingIntervalValue: 1,
    });
    invoiceCreationService.createInvoice.mockResolvedValue({});

    await scheduler.processDueSubscriptions();

    expect(invoiceCreationService.createInvoice).toHaveBeenCalledTimes(1);
    expect(invoiceCreationService.createInvoice).toHaveBeenCalledWith(
      'sub-2',
      'user-2',
      'Recurring billing for Plan 2',
      expect.objectContaining({
        billUntil: expect.any(Date),
        skipIfNoBillableAmount: true,
      }),
    );
  });
});
