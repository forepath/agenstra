import { getTodayBillingDay } from '../utils/billing-day.utils';
import { OpenPositionInvoiceScheduler } from './open-position-invoice.scheduler';

jest.mock('../utils/billing-day.utils', () => ({
  getTodayBillingDay: jest.fn(),
}));

const getTodayBillingDayMock = getTodayBillingDay as jest.MockedFunction<typeof getTodayBillingDay>;

describe('OpenPositionInvoiceScheduler', () => {
  let usersBillingDayRepository: { findUserIdsWithBillingDay: jest.Mock };
  let openPositionsRepository: { findUnbilledByUserId: jest.Mock; markBilled: jest.Mock };
  let invoiceCreationService: { createAccumulatedInvoice: jest.Mock };

  beforeEach(() => {
    jest.resetAllMocks();
    getTodayBillingDayMock.mockReturnValue(10);
    usersBillingDayRepository = { findUserIdsWithBillingDay: jest.fn() };
    openPositionsRepository = { findUnbilledByUserId: jest.fn(), markBilled: jest.fn() };
    invoiceCreationService = { createAccumulatedInvoice: jest.fn() };
  });

  function createScheduler() {
    return new OpenPositionInvoiceScheduler(
      usersBillingDayRepository as never,
      openPositionsRepository as never,
      invoiceCreationService as never,
    );
  }

  it('does nothing when no users have billing day today', async () => {
    usersBillingDayRepository.findUserIdsWithBillingDay.mockResolvedValue([]);
    const scheduler = createScheduler();

    await scheduler.processBillingDayInvoices();

    expect(openPositionsRepository.findUnbilledByUserId).not.toHaveBeenCalled();
    expect(invoiceCreationService.createAccumulatedInvoice).not.toHaveBeenCalled();
  });

  it('creates one accumulated invoice per user with all unbilled positions', async () => {
    const positions = [
      {
        id: 'pos-1',
        subscriptionId: 'sub-1',
        userId: 'user-1',
        description: 'Subscription 123',
        billUntil: new Date('2024-02-01'),
        skipIfNoBillableAmount: true,
      },
    ];
    usersBillingDayRepository.findUserIdsWithBillingDay.mockResolvedValue(['user-1']);
    openPositionsRepository.findUnbilledByUserId.mockResolvedValue(positions);
    invoiceCreationService.createAccumulatedInvoice.mockResolvedValue({
      invoiceRefId: 'ref-1',
    });

    const scheduler = createScheduler();
    await scheduler.processBillingDayInvoices();

    expect(usersBillingDayRepository.findUserIdsWithBillingDay).toHaveBeenCalledWith(10);
    expect(openPositionsRepository.findUnbilledByUserId).toHaveBeenCalledWith('user-1');
    expect(invoiceCreationService.createAccumulatedInvoice).toHaveBeenCalledTimes(1);
    expect(invoiceCreationService.createAccumulatedInvoice).toHaveBeenCalledWith('user-1', positions);
    expect(openPositionsRepository.markBilled).not.toHaveBeenCalled();
  });

  it('does nothing when createAccumulatedInvoice returns undefined (no billable amount)', async () => {
    usersBillingDayRepository.findUserIdsWithBillingDay.mockResolvedValue(['user-1']);
    openPositionsRepository.findUnbilledByUserId.mockResolvedValue([
      {
        id: 'pos-1',
        subscriptionId: 'sub-1',
        userId: 'user-1',
        description: 'Sub',
        billUntil: new Date(),
        skipIfNoBillableAmount: true,
      },
    ]);
    invoiceCreationService.createAccumulatedInvoice.mockResolvedValue(undefined);

    const scheduler = createScheduler();
    await scheduler.processBillingDayInvoices();

    expect(invoiceCreationService.createAccumulatedInvoice).toHaveBeenCalledWith('user-1', expect.any(Array));
    expect(openPositionsRepository.markBilled).not.toHaveBeenCalled();
  });

  it('continues with next user when createAccumulatedInvoice throws', async () => {
    usersBillingDayRepository.findUserIdsWithBillingDay.mockResolvedValue(['user-1', 'user-2']);
    openPositionsRepository.findUnbilledByUserId
      .mockResolvedValueOnce([
        {
          id: 'pos-1',
          subscriptionId: 'sub-1',
          userId: 'user-1',
          description: 'Sub 1',
          billUntil: new Date(),
          skipIfNoBillableAmount: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'pos-2',
          subscriptionId: 'sub-2',
          userId: 'user-2',
          description: 'Sub 2',
          billUntil: new Date(),
          skipIfNoBillableAmount: true,
        },
      ]);
    invoiceCreationService.createAccumulatedInvoice
      .mockRejectedValueOnce(new Error('Invoice Ninja error'))
      .mockResolvedValueOnce({ invoiceRefId: 'ref-2' });

    const scheduler = createScheduler();
    await scheduler.processBillingDayInvoices();

    expect(invoiceCreationService.createAccumulatedInvoice).toHaveBeenCalledTimes(2);
    expect(invoiceCreationService.createAccumulatedInvoice).toHaveBeenNthCalledWith(1, 'user-1', expect.any(Array));
    expect(invoiceCreationService.createAccumulatedInvoice).toHaveBeenNthCalledWith(2, 'user-2', expect.any(Array));
  });

  it('skips user when findUnbilledByUserId returns empty', async () => {
    usersBillingDayRepository.findUserIdsWithBillingDay.mockResolvedValue(['user-1']);
    openPositionsRepository.findUnbilledByUserId.mockResolvedValue([]);

    const scheduler = createScheduler();
    await scheduler.processBillingDayInvoices();

    expect(invoiceCreationService.createAccumulatedInvoice).not.toHaveBeenCalled();
  });
});
