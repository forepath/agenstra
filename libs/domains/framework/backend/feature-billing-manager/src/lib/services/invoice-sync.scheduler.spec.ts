import { InvoiceSyncScheduler } from './invoice-sync.scheduler';

describe('InvoiceSyncScheduler', () => {
  const invoiceRefsRepository = {
    findBatchForSync: jest.fn(),
    update: jest.fn(),
  } as any;
  const invoiceNinjaService = {
    getInvoiceDetailsForSync: jest.fn(),
  } as any;

  const scheduler = new InvoiceSyncScheduler(invoiceRefsRepository, invoiceNinjaService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('syncs invoice status and invoiceNumber when API returns different values', async () => {
    const refs = [
      {
        id: 'ref-1',
        invoiceNinjaId: 'ninja-1',
        status: '1',
        preAuthUrl: 'https://old.example/inv/old',
        invoiceNumber: 'INV-001',
      },
    ];
    invoiceRefsRepository.findBatchForSync.mockResolvedValue(refs);
    invoiceNinjaService.getInvoiceDetailsForSync.mockResolvedValue({
      status: '2',
      invoiceNumber: 'INV-002',
    });

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceNinjaService.getInvoiceDetailsForSync).toHaveBeenCalledWith('ninja-1');
    expect(invoiceRefsRepository.update).toHaveBeenCalledWith('ref-1', {
      status: '2',
      invoiceNumber: 'INV-002',
    });
  });

  it('syncs balance when API returns different value', async () => {
    const refs = [
      {
        id: 'ref-bal',
        invoiceNinjaId: 'ninja-bal',
        status: '2',
        invoiceNumber: 'INV-003',
        balance: 50,
      },
    ];
    invoiceRefsRepository.findBatchForSync.mockResolvedValue(refs);
    invoiceNinjaService.getInvoiceDetailsForSync.mockResolvedValue({
      status: '2',
      invoiceNumber: 'INV-003',
      balance: 75.5,
    });

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceRefsRepository.update).toHaveBeenCalledWith('ref-bal', {
      balance: 75.5,
    });
  });

  it('updates only when status or invoiceNumber changed', async () => {
    const refs = [
      {
        id: 'ref-2',
        invoiceNinjaId: 'ninja-2',
        status: '2',
        preAuthUrl: 'https://same.example/link',
        invoiceNumber: 'INV-002',
      },
    ];
    invoiceRefsRepository.findBatchForSync.mockResolvedValue(refs);
    invoiceNinjaService.getInvoiceDetailsForSync.mockResolvedValue({
      status: '2',
      invoiceNumber: 'INV-002',
    });

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceRefsRepository.update).not.toHaveBeenCalled();
  });

  it('handles empty batch', async () => {
    invoiceRefsRepository.findBatchForSync.mockResolvedValue([]);

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceNinjaService.getInvoiceDetailsForSync).not.toHaveBeenCalled();
    expect(invoiceRefsRepository.update).not.toHaveBeenCalled();
  });

  it('continues processing when getInvoiceDetailsForSync returns null', async () => {
    const refs = [
      {
        id: 'ref-3',
        invoiceNinjaId: 'ninja-missing',
        status: '1',
        preAuthUrl: 'https://example.com',
        invoiceNumber: 'INV-003',
      },
    ];
    invoiceRefsRepository.findBatchForSync.mockResolvedValue(refs);
    invoiceNinjaService.getInvoiceDetailsForSync.mockResolvedValue(null);

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceNinjaService.getInvoiceDetailsForSync).toHaveBeenCalledWith('ninja-missing');
    expect(invoiceRefsRepository.update).not.toHaveBeenCalled();
  });

  it('continues processing on individual ref errors', async () => {
    const refs = [
      {
        id: 'ref-4',
        invoiceNinjaId: 'ninja-4',
        status: '1',
        preAuthUrl: 'https://example.com',
        invoiceNumber: 'INV-004',
      },
      {
        id: 'ref-5',
        invoiceNinjaId: 'ninja-5',
        status: '1',
        preAuthUrl: 'https://example.com',
        invoiceNumber: 'INV-005',
      },
    ];
    invoiceRefsRepository.findBatchForSync.mockResolvedValue(refs);
    invoiceNinjaService.getInvoiceDetailsForSync
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: '3', invoiceNumber: 'INV-005' });

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceRefsRepository.update).toHaveBeenCalledTimes(1);
    expect(invoiceRefsRepository.update).toHaveBeenCalledWith('ref-5', {
      status: '3',
    });
  });

  it('processes multiple batches when first batch is full', async () => {
    const fullBatch = Array.from({ length: 100 }, (_, i) => ({
      id: `ref-b-${i}`,
      invoiceNinjaId: `ninja-b-${i}`,
      status: '1',
      preAuthUrl: 'https://example.com',
      invoiceNumber: `INV-B-${i}`,
    }));
    const secondBatch = [
      {
        id: 'ref-b2',
        invoiceNinjaId: 'ninja-b2',
        status: '1',
        preAuthUrl: 'https://example.com',
        invoiceNumber: 'INV-B2',
      },
    ];
    invoiceRefsRepository.findBatchForSync
      .mockResolvedValueOnce(fullBatch)
      .mockResolvedValueOnce(secondBatch)
      .mockResolvedValueOnce([]);
    invoiceNinjaService.getInvoiceDetailsForSync.mockResolvedValue({});

    await scheduler.syncInvoicesFromInvoiceNinja();

    expect(invoiceRefsRepository.findBatchForSync).toHaveBeenCalledWith(100, 0);
    expect(invoiceRefsRepository.findBatchForSync).toHaveBeenCalledWith(100, 100);
    expect(invoiceNinjaService.getInvoiceDetailsForSync).toHaveBeenCalledTimes(101);
  });
});
