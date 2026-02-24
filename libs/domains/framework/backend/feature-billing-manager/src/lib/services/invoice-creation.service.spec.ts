import { InvoiceCreationService } from './invoice-creation.service';
import { BillingScheduleService } from './billing-schedule.service';

describe('InvoiceCreationService', () => {
  it('creates invoice for subscription', async () => {
    const subscriptionsRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      }),
    } as any;
    const plansRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'plan-1',
        basePrice: '10',
        marginPercent: '0',
        marginFixed: '0',
        billingIntervalType: 'day',
        billingIntervalValue: 1,
        billingDayOfMonth: undefined,
      }),
    } as any;
    const pricingService = { calculate: jest.fn().mockReturnValue({ totalPrice: 10 }) } as any;
    const invoiceNinjaService = { createInvoiceForSubscription: jest.fn().mockResolvedValue({}) } as any;
    const usageRecordsRepository = { findLatestForSubscription: jest.fn().mockResolvedValue(null) } as any;
    const billingScheduleService = new BillingScheduleService();
    const invoiceRefsRepository = {
      findLatestBySubscription: jest.fn().mockResolvedValue(null),
    } as any;
    const service = new InvoiceCreationService(
      subscriptionsRepository,
      plansRepository,
      pricingService,
      invoiceNinjaService,
      usageRecordsRepository,
      billingScheduleService,
      invoiceRefsRepository,
    );

    await service.createInvoice('sub-1', 'user-1', 'Test');
    expect(invoiceNinjaService.createInvoiceForSubscription).toHaveBeenCalled();
  });

  it('calculates partial base amount since last invoice for manual billing', async () => {
    const lastInvoiceAt = new Date('2024-01-01T00:00:00Z');
    const billUntil = new Date('2024-01-02T12:00:00Z'); // 1.5 days

    const subscriptionsRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        createdAt: new Date('2023-12-31T00:00:00Z'),
      }),
    } as any;
    const plansRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'plan-1',
        basePrice: '10',
        marginPercent: '0',
        marginFixed: '0',
        billingIntervalType: 'day',
        billingIntervalValue: 1,
        billingDayOfMonth: undefined,
      }),
    } as any;
    const pricingService = { calculate: jest.fn().mockReturnValue({ totalPrice: 20 }) } as any;
    const invoiceNinjaService = { createInvoiceForSubscription: jest.fn().mockResolvedValue({}) } as any;
    const usageRecordsRepository = { findLatestForSubscription: jest.fn().mockResolvedValue(null) } as any;
    const billingScheduleService = new BillingScheduleService();
    const invoiceRefsRepository = {
      findLatestBySubscription: jest.fn().mockResolvedValue({ createdAt: lastInvoiceAt }),
    } as any;

    const service = new InvoiceCreationService(
      subscriptionsRepository,
      plansRepository,
      pricingService,
      invoiceNinjaService,
      usageRecordsRepository,
      billingScheduleService,
      invoiceRefsRepository,
    );

    await service.createInvoice('sub-1', 'user-1', 'Manual', { billUntil });

    expect(invoiceNinjaService.createInvoiceForSubscription).toHaveBeenCalledWith(
      'sub-1',
      'user-1',
      // 1.5 * 20 = 30
      30,
      'Manual',
    );
  });

  it('does not bill beyond subscription end when cancelEffectiveAt is in the past', async () => {
    const lastInvoiceAt = new Date('2024-01-01T00:00:00Z');
    const billUntil = new Date('2024-01-20T00:00:00Z');

    const subscriptionsRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        createdAt: new Date('2023-12-31T00:00:00Z'),
        cancelEffectiveAt: new Date('2024-01-10T00:00:00Z'),
      }),
    } as any;
    const plansRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'plan-1',
        basePrice: '10',
        marginPercent: '0',
        marginFixed: '0',
        billingIntervalType: 'day',
        billingIntervalValue: 1,
        billingDayOfMonth: undefined,
      }),
    } as any;
    const pricingService = { calculate: jest.fn().mockReturnValue({ totalPrice: 10 }) } as any;
    const invoiceNinjaService = { createInvoiceForSubscription: jest.fn().mockResolvedValue({}) } as any;
    const usageRecordsRepository = { findLatestForSubscription: jest.fn().mockResolvedValue(null) } as any;
    const billingScheduleService = new BillingScheduleService();
    const invoiceRefsRepository = {
      findLatestBySubscription: jest.fn().mockResolvedValue({ createdAt: lastInvoiceAt }),
    } as any;

    const service = new InvoiceCreationService(
      subscriptionsRepository,
      plansRepository,
      pricingService,
      invoiceNinjaService,
      usageRecordsRepository,
      billingScheduleService,
      invoiceRefsRepository,
    );

    await service.createInvoice('sub-1', 'user-1', 'Final', { billUntil });

    // From 2024-01-01 to 2024-01-10 is 9 full days, so 9 * 10
    expect(invoiceNinjaService.createInvoiceForSubscription).toHaveBeenCalledWith('sub-1', 'user-1', 90, 'Final');
  });

  it('skips invoice when total is below minimum and skipIfNoBillableAmount is true', async () => {
    const subscriptionsRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      }),
    } as any;
    const plansRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'plan-1',
        basePrice: '10',
        marginPercent: '0',
        marginFixed: '0',
        billingIntervalType: 'day',
        billingIntervalValue: 1,
        billingDayOfMonth: undefined,
      }),
    } as any;
    const pricingService = { calculate: jest.fn().mockReturnValue({ totalPrice: 10 }) } as any;
    const invoiceNinjaService = { createInvoiceForSubscription: jest.fn().mockResolvedValue({}) } as any;
    const usageRecordsRepository = { findLatestForSubscription: jest.fn().mockResolvedValue(null) } as any;
    const billingScheduleService = new BillingScheduleService();
    const invoiceRefsRepository = {
      findLatestBySubscription: jest.fn().mockResolvedValue(null),
    } as any;

    const service = new InvoiceCreationService(
      subscriptionsRepository,
      plansRepository,
      pricingService,
      invoiceNinjaService,
      usageRecordsRepository,
      billingScheduleService,
      invoiceRefsRepository,
    );

    (service as any).calculateBaseAmountSinceLastBilling = jest.fn().mockResolvedValue(0.005);

    await service.createInvoice('sub-1', 'user-1', 'Tiny', {
      billUntil: new Date('2024-01-01T00:02:00Z'),
      skipIfNoBillableAmount: true,
    });

    expect(invoiceNinjaService.createInvoiceForSubscription).not.toHaveBeenCalled();
  });

  it('throws when total is below minimum and skipIfNoBillableAmount is false', async () => {
    const subscriptionsRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      }),
    } as any;
    const plansRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'plan-1',
        basePrice: '10',
        marginPercent: '0',
        marginFixed: '0',
        billingIntervalType: 'day',
        billingIntervalValue: 1,
        billingDayOfMonth: undefined,
      }),
    } as any;
    const pricingService = { calculate: jest.fn().mockReturnValue({ totalPrice: 10 }) } as any;
    const invoiceNinjaService = { createInvoiceForSubscription: jest.fn().mockResolvedValue({}) } as any;
    const usageRecordsRepository = { findLatestForSubscription: jest.fn().mockResolvedValue(null) } as any;
    const billingScheduleService = new BillingScheduleService();
    const invoiceRefsRepository = {
      findLatestBySubscription: jest.fn().mockResolvedValue(null),
    } as any;

    const service = new InvoiceCreationService(
      subscriptionsRepository,
      plansRepository,
      pricingService,
      invoiceNinjaService,
      usageRecordsRepository,
      billingScheduleService,
      invoiceRefsRepository,
    );

    (service as any).calculateBaseAmountSinceLastBilling = jest.fn().mockResolvedValue(0.005);

    await expect(
      service.createInvoice('sub-1', 'user-1', 'Tiny', {
        billUntil: new Date('2024-01-01T00:02:00Z'),
      }),
    ).rejects.toThrow('No billable amount since last invoice');

    expect(invoiceNinjaService.createInvoiceForSubscription).not.toHaveBeenCalled();
  });
});
