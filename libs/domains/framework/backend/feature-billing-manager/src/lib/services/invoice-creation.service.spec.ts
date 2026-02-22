import { InvoiceCreationService } from './invoice-creation.service';

describe('InvoiceCreationService', () => {
  it('creates invoice for subscription', async () => {
    const subscriptionsRepository = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'sub-1', userId: 'user-1', planId: 'plan-1' }),
    } as any;
    const plansRepository = { findByIdOrThrow: jest.fn().mockResolvedValue({ basePrice: '10' }) } as any;
    const pricingService = { calculate: jest.fn().mockReturnValue({ totalPrice: 10 }) } as any;
    const invoiceNinjaService = { createInvoiceForSubscription: jest.fn().mockResolvedValue({}) } as any;
    const usageRecordsRepository = { findLatestForSubscription: jest.fn().mockResolvedValue(null) } as any;
    const service = new InvoiceCreationService(
      subscriptionsRepository,
      plansRepository,
      pricingService,
      invoiceNinjaService,
      usageRecordsRepository,
    );

    await service.createInvoice('sub-1', 'user-1', 'Test');
    expect(invoiceNinjaService.createInvoiceForSubscription).toHaveBeenCalled();
  });
});
