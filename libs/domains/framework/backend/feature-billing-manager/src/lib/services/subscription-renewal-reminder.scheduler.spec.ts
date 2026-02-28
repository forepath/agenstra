import { SubscriptionRenewalReminderScheduler } from './subscription-renewal-reminder.scheduler';

describe('SubscriptionRenewalReminderScheduler', () => {
  const subscriptionsRepository = {
    findUpcomingRenewals: jest.fn(),
  } as any;
  const servicePlansRepository = {
    findByIdOrThrow: jest.fn(),
  } as any;
  const customerProfilesRepository = {
    findByUserId: jest.fn(),
  } as any;
  const emailService = {
    isEnabled: jest.fn(),
    send: jest.fn(),
  } as any;

  let scheduler: SubscriptionRenewalReminderScheduler;

  beforeEach(() => {
    jest.resetAllMocks();
    scheduler = new SubscriptionRenewalReminderScheduler(
      subscriptionsRepository,
      servicePlansRepository,
      customerProfilesRepository,
      emailService,
    );
  });

  it('sends renewal reminder', async () => {
    emailService.isEnabled.mockReturnValue(true);
    subscriptionsRepository.findUpcomingRenewals.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        currentPeriodEnd: new Date('2024-02-01'),
        nextBillingAt: new Date('2024-02-15'),
      },
    ]);
    customerProfilesRepository.findByUserId.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      firstName: 'John',
    });
    servicePlansRepository.findByIdOrThrow.mockResolvedValue({
      id: 'plan-1',
      name: 'Basic Plan',
    });
    emailService.send.mockResolvedValue(true);

    await scheduler.processUpcomingRenewals();

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Upcoming subscription renewal: Basic Plan',
      }),
    );
  });

  it('skips when email disabled', async () => {
    emailService.isEnabled.mockReturnValue(false);

    await scheduler.processUpcomingRenewals();

    expect(subscriptionsRepository.findUpcomingRenewals).not.toHaveBeenCalled();
  });

  it('handles empty upcoming renewals', async () => {
    emailService.isEnabled.mockReturnValue(true);
    subscriptionsRepository.findUpcomingRenewals.mockResolvedValue([]);

    await scheduler.processUpcomingRenewals();

    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('skips when no email found for user', async () => {
    emailService.isEnabled.mockReturnValue(true);
    subscriptionsRepository.findUpcomingRenewals.mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', planId: 'plan-1' },
    ]);
    customerProfilesRepository.findByUserId.mockResolvedValue(null);

    await scheduler.processUpcomingRenewals();

    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('skips when email profile has no email', async () => {
    emailService.isEnabled.mockReturnValue(true);
    subscriptionsRepository.findUpcomingRenewals.mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', planId: 'plan-1' },
    ]);
    customerProfilesRepository.findByUserId.mockResolvedValue({
      userId: 'user-1',
      email: null,
    });

    await scheduler.processUpcomingRenewals();

    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('skips duplicate reminder for same period', async () => {
    emailService.isEnabled.mockReturnValue(true);
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      currentPeriodEnd: new Date('2024-02-01'),
      nextBillingAt: new Date('2024-02-15'),
    };
    subscriptionsRepository.findUpcomingRenewals.mockResolvedValue([subscription, subscription]);
    customerProfilesRepository.findByUserId.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
    });
    servicePlansRepository.findByIdOrThrow.mockResolvedValue({ id: 'plan-1', name: 'Plan' });
    emailService.send.mockResolvedValue(true);

    await scheduler.processUpcomingRenewals();

    expect(emailService.send).toHaveBeenCalledTimes(1);
  });
});
