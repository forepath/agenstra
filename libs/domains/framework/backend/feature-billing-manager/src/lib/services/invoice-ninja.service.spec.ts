import axios from 'axios';
import { CustomerProfilesService } from './customer-profiles.service';
import { InvoiceNinjaService } from './invoice-ninja.service';

const mockPost = jest.fn();
const mockPut = jest.fn();
const mockClient = { post: mockPost, put: mockPut, get: jest.fn() };

describe('InvoiceNinjaService', () => {
  const invoiceRefsRepository = { findBySubscription: jest.fn(), create: jest.fn() } as any;

  let customerProfilesService: jest.Mocked<CustomerProfilesService>;
  let createSpy: jest.SpyInstance;

  beforeAll(() => {
    createSpy = jest.spyOn(axios, 'create').mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);
  });

  afterAll(() => {
    createSpy?.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    customerProfilesService = {
      getByUserId: jest.fn(),
      updateInvoiceNinjaClientId: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CustomerProfilesService>;
    mockPost.mockResolvedValue({ data: { data: { id: 'new-client-1' } } });
    mockPut.mockResolvedValue({});
  });

  it('skips sync when profile missing', async () => {
    customerProfilesService.getByUserId.mockResolvedValue(null);
    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    const result = await service.syncCustomerProfile('user-1');
    expect(result).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('sends country as ISO 3166-1 alpha-3 when profile has alpha-2 country', async () => {
    customerProfilesService.getByUserId.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'DE',
      addressLine1: 'Street 1',
      city: 'Berlin',
      postalCode: '10115',
    } as never);
    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    const result = await service.syncCustomerProfile('user-1');
    expect(result).toBe('new-client-1');
    expect(mockPost).toHaveBeenCalledTimes(1);
    const payload = mockPost.mock.calls[0][1];
    expect(payload.country_id).toBe(276);
  });

  it('passes through country when not two characters (e.g. already alpha-3 or empty)', async () => {
    customerProfilesService.getByUserId.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'USA',
      addressLine1: 'Street 1',
      city: 'New York',
      postalCode: '10001',
    } as never);
    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    await service.syncCustomerProfile('user-1');
    const payload = mockPost.mock.calls[0][1];
    expect(payload.country_id).toBe(840);
  });

  it('sends alpha-3 country when updating existing client (PUT)', async () => {
    customerProfilesService.getByUserId.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      invoiceNinjaClientId: 'existing-invoice-ninja-id',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'GB',
      addressLine1: 'Street 1',
      city: 'London',
      postalCode: 'SW1A 1AA',
    } as never);
    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    const result = await service.syncCustomerProfile('user-1');
    expect(result).toBe('existing-invoice-ninja-id');
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPost).not.toHaveBeenCalled();
    const payload = mockPut.mock.calls[0][1];
    expect(payload.country_id).toBe(826);
  });

  it('creates a new client and updates reference when existing InvoiceNinja client is missing (404)', async () => {
    customerProfilesService.getByUserId.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      invoiceNinjaClientId: 'missing-client-id',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'DE',
      addressLine1: 'Street 1',
      city: 'Berlin',
      postalCode: '10115',
    } as never);

    mockPut.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Not found',
      name: 'AxiosError',
      config: {},
      toJSON: () => ({}),
      response: {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {},
        data: {},
      },
    });
    mockPost.mockResolvedValueOnce({ data: { data: { id: 'created-client-id' } } });

    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    const result = await service.syncCustomerProfile('user-1');

    expect(result).toBe('created-client-id');
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(customerProfilesService.updateInvoiceNinjaClientId).toHaveBeenCalledWith('user-1', 'created-client-id');
  });

  it('treats InvoiceNinja 400 \"No query results for model\" as missing client and recreates it', async () => {
    customerProfilesService.getByUserId.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      invoiceNinjaClientId: 'missing-client-id',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'DE',
      addressLine1: 'Street 1',
      city: 'Berlin',
      postalCode: '10115',
    } as never);

    mockPut.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'No query results for model',
      name: 'AxiosError',
      config: {},
      toJSON: () => ({}),
      response: {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {},
        data: {
          message: 'No query results for model [App\\\\Models\\\\Client]',
        },
      },
    });
    mockPost.mockResolvedValueOnce({ data: { data: { id: 'created-client-id-400' } } });

    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    const result = await service.syncCustomerProfile('user-1');

    expect(result).toBe('created-client-id-400');
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(customerProfilesService.updateInvoiceNinjaClientId).toHaveBeenCalledWith('user-1', 'created-client-id-400');
  });

  it('createInvoiceForSubscription accepts unwrapped response and builds client URL from invitation key', async () => {
    customerProfilesService.getByUserId.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      invoiceNinjaClientId: 'client-1',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'DE',
      addressLine1: 'Street 1',
      city: 'Berlin',
      postalCode: '10115',
    } as never);
    mockPut.mockResolvedValue({});
    invoiceRefsRepository.create.mockResolvedValue({ id: 'ref-1' } as never);

    const unwrappedInvoiceResponse = {
      id: 'inv-xyz',
      number: 'INV-2024-0001',
      status_id: '2',
      invitations: [{ key: 'invitation-key-123', link: '' }],
    };
    mockPost.mockResolvedValueOnce({ data: unwrappedInvoiceResponse });

    const service = new InvoiceNinjaService(
      invoiceRefsRepository,
      customerProfilesService as unknown as CustomerProfilesService,
    );
    const result = await service.createInvoiceForSubscription('sub-1', 'user-1', 99, 'Test description');

    expect(result).toEqual({
      invoiceId: 'inv-xyz',
      preAuthUrl: '/client/invoice/invitation-key-123',
      invoiceRefId: 'ref-1',
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/invoices',
      expect.objectContaining({
        client_id: 'client-1',
        line_items: [{ product_key: 'subscription', notes: 'Test description', cost: 99, quantity: 1 }],
      }),
      expect.objectContaining({
        params: { send_email: 'true' },
      }),
    );
    expect(invoiceRefsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-1',
        invoiceNinjaId: 'inv-xyz',
        invoiceNumber: 'INV-2024-0001',
        preAuthUrl: '/client/invoice/invitation-key-123',
        status: '2',
      }),
    );
  });

  describe('createInvoiceWithLineItems', () => {
    it('creates one invoice with multiple line items and returns invoiceRefId', async () => {
      customerProfilesService.getByUserId.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        invoiceNinjaClientId: 'client-1',
      } as never);
      mockPut.mockResolvedValue({});
      invoiceRefsRepository.create.mockResolvedValue({ id: 'ref-1' } as never);
      const lineItems = [
        { description: 'Subscription 123', amount: 50 },
        { description: 'Subscription 456', amount: 30 },
      ];
      mockPost.mockResolvedValueOnce({
        data: {
          id: 'inv-acc',
          number: 'INV-ACC-001',
          status_id: '2',
          invitations: [{ key: 'key-acc', link: '' }],
        },
      });

      const service = new InvoiceNinjaService(
        invoiceRefsRepository,
        customerProfilesService as unknown as CustomerProfilesService,
      );
      const result = await service.createInvoiceWithLineItems('user-1', lineItems, 'sub-1');

      expect(result).toEqual({
        invoiceId: 'inv-acc',
        preAuthUrl: '/client/invoice/key-acc',
        invoiceRefId: 'ref-1',
      });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/invoices',
        expect.objectContaining({
          client_id: 'client-1',
          line_items: [
            { product_key: 'subscription', notes: 'Subscription 123', cost: 50, quantity: 1 },
            { product_key: 'subscription', notes: 'Subscription 456', cost: 30, quantity: 1 },
          ],
        }),
        expect.any(Object),
      );
      expect(invoiceRefsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-1',
          invoiceNinjaId: 'inv-acc',
        }),
      );
    });
  });

  describe('getInvoiceDetailsForSync balance', () => {
    it('returns balance when API includes it', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          id: 'inv-1',
          status_id: '2',
          number: 'INV-001',
          balance: 99.99,
        },
      });
      const service = new InvoiceNinjaService(
        invoiceRefsRepository,
        customerProfilesService as unknown as CustomerProfilesService,
      );
      const result = await service.getInvoiceDetailsForSync('inv-1');
      expect(result?.balance).toBe(99.99);
    });

    it('parses string balance as number', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          id: 'inv-1',
          status_id: '2',
          balance: '42.50',
        },
      });
      const service = new InvoiceNinjaService(
        invoiceRefsRepository,
        customerProfilesService as unknown as CustomerProfilesService,
      );
      const result = await service.getInvoiceDetailsForSync('inv-1');
      expect(result?.balance).toBe(42.5);
    });
  });

  describe('getInvoiceClientLink', () => {
    it('returns preAuthUrl from getInvoiceDetailsForSync', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          id: 'inv-1',
          status_id: '2',
          number: 'INV-001',
          url: 'https://app.invoiceninja.com/client/invoice/abc123',
        },
      });
      const service = new InvoiceNinjaService(
        invoiceRefsRepository,
        customerProfilesService as unknown as CustomerProfilesService,
      );
      const result = await service.getInvoiceClientLink('inv-1');
      expect(result).toBe('https://app.invoiceninja.com/client/invoice/abc123');
    });

    it('returns null when getInvoiceDetailsForSync returns null', async () => {
      mockClient.get.mockRejectedValueOnce({ response: { status: 404 } });
      const service = new InvoiceNinjaService(
        invoiceRefsRepository,
        customerProfilesService as unknown as CustomerProfilesService,
      );
      const result = await service.getInvoiceClientLink('inv-missing');
      expect(result).toBeNull();
    });
  });
});
