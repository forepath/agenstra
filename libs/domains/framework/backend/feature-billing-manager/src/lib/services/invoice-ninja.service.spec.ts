import { CustomerProfilesService } from './customer-profiles.service';
import { InvoiceNinjaService } from './invoice-ninja.service';

describe('InvoiceNinjaService', () => {
  it('skips sync when profile missing', async () => {
    const invoiceRefsRepository = { findBySubscription: jest.fn(), create: jest.fn() } as any;
    const customerProfilesService = {
      getByUserId: jest.fn().mockResolvedValue(null),
    } as unknown as CustomerProfilesService;
    const service = new InvoiceNinjaService(invoiceRefsRepository, customerProfilesService);
    const result = await service.syncCustomerProfile('user-1');
    expect(result).toBeNull();
  });
});
