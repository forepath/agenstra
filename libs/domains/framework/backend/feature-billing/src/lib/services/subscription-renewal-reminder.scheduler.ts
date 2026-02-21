import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { CustomerProfilesRepository } from '../repositories/customer-profiles.repository';
import { EmailService } from '@forepath/shared/backend';

@Injectable()
export class SubscriptionRenewalReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionRenewalReminderScheduler.name);
  private intervalHandle?: NodeJS.Timeout;

  private readonly intervalMs = parseInt(process.env.REMINDER_SCHEDULER_INTERVAL ?? '3600000', 10);
  private readonly reminderDays = parseInt(process.env.REMINDER_DAYS ?? '3', 10);
  private readonly batchSize = parseInt(process.env.REMINDER_SCHEDULER_BATCH_SIZE ?? '100', 10);

  private readonly sentReminders = new Map<string, Date>();

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly customerProfilesRepository: CustomerProfilesRepository,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit(): void {
    this.logger.log(
      `Initializing reminder scheduler with ${this.intervalMs}ms interval, reminding ${this.reminderDays} days before renewal`,
    );
    this.intervalHandle = setInterval(() => {
      void this.processUpcomingRenewals();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processUpcomingRenewals(): Promise<void> {
    if (!this.emailService.isEnabled()) {
      return;
    }

    const now = new Date();
    const upcomingSubscriptions = await this.subscriptionsRepository.findUpcomingRenewals(
      this.reminderDays,
      now,
      this.batchSize,
    );

    if (upcomingSubscriptions.length === 0) {
      return;
    }

    this.logger.log(`Processing ${upcomingSubscriptions.length} subscriptions with upcoming renewals`);

    for (const subscription of upcomingSubscriptions) {
      try {
        await this.processSubscriptionReminder(subscription, now);
      } catch (error) {
        this.logger.error(`Failed to send reminder for subscription ${subscription.id}: ${(error as Error).message}`);
      }
    }

    this.cleanupOldReminders(now);
  }

  private async processSubscriptionReminder(subscription: SubscriptionEntity, now: Date): Promise<void> {
    const periodKey = `${subscription.id}:${subscription.currentPeriodEnd?.getTime()}`;

    if (this.sentReminders.has(periodKey)) {
      return;
    }

    const profile = await this.customerProfilesRepository.findByUserId(subscription.userId);
    const email = profile?.email;

    if (!email) {
      this.logger.debug(`No email found for user ${subscription.userId}, skipping reminder`);
      return;
    }

    const plan = await this.servicePlansRepository.findByIdOrThrow(subscription.planId);
    const renewalDate = subscription.nextBillingAt?.toLocaleDateString() ?? 'soon';

    const sent = await this.emailService.send({
      to: email,
      subject: `Upcoming subscription renewal: ${plan.name}`,
      text: `Dear ${profile.firstName ?? 'Customer'},\n\nYour subscription "${plan.name}" is scheduled for renewal on ${renewalDate}.\n\nIf you wish to cancel, please log in to your account before the renewal date.\n\nBest regards,\nThe Billing Team`,
      html: `<p>Dear ${profile.firstName ?? 'Customer'},</p><p>Your subscription "<strong>${plan.name}</strong>" is scheduled for renewal on <strong>${renewalDate}</strong>.</p><p>If you wish to cancel, please log in to your account before the renewal date.</p><p>Best regards,<br>The Billing Team</p>`,
    });

    if (sent) {
      this.sentReminders.set(periodKey, now);
      this.logger.log(`Sent renewal reminder for subscription ${subscription.id} to ${email}`);
    }
  }

  private cleanupOldReminders(now: Date): void {
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    for (const [key, timestamp] of this.sentReminders.entries()) {
      if (now.getTime() - timestamp.getTime() > maxAge) {
        this.sentReminders.delete(key);
      }
    }
  }
}
