import { BadRequestException, Injectable } from '@nestjs/common';
import { InvoiceNinjaService } from './invoice-ninja.service';
import { PricingService } from './pricing.service';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { UsageRecordsRepository } from '../repositories/usage-records.repository';
import { BillingScheduleService } from './billing-schedule.service';
import { BillingIntervalType } from '../entities/service-plan.entity';
import { InvoiceRefsRepository } from '../repositories/invoice-refs.repository';
import type { SubscriptionEntity } from '../entities/subscription.entity';
import type { ServicePlanEntity } from '../entities/service-plan.entity';

interface InvoiceCreationOptions {
  /**
   * Bill usage from the last invoice (or subscription start) up to this timestamp.
   * Defaults to the current time when not provided.
   */
  billUntil?: Date;
  /**
   * When true, no invoice will be created if there is nothing billable
   * (base amount and usage are both zero or negative, or below the minimum billable amount).
   * Useful for schedulers.
   */
  skipIfNoBillableAmount?: boolean;
}

const MIN_BILLABLE_AMOUNT = 0.01;

@Injectable()
export class InvoiceCreationService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly pricingService: PricingService,
    private readonly invoiceNinjaService: InvoiceNinjaService,
    private readonly usageRecordsRepository: UsageRecordsRepository,
    private readonly billingScheduleService: BillingScheduleService,
    private readonly invoiceRefsRepository: InvoiceRefsRepository,
  ) {}

  async createInvoice(subscriptionId: string, userId: string, description?: string, options?: InvoiceCreationOptions) {
    const subscription = await this.subscriptionsRepository.findByIdOrThrow(subscriptionId);
    if (subscription.userId !== userId) {
      throw new BadRequestException('Subscription does not belong to user');
    }

    const plan = await this.servicePlansRepository.findByIdOrThrow(subscription.planId);
    const pricing = this.pricingService.calculate(plan);
    const usage = await this.usageRecordsRepository.findLatestForSubscription(subscriptionId);
    const usageCost = usage ? this.extractUsageCost(usage.usagePayload) : 0;

    const billUntil = options?.billUntil ?? new Date();
    const baseAmount = await this.calculateBaseAmountSinceLastBilling(
      subscription,
      plan,
      pricing.totalPrice,
      billUntil,
    );

    const total = baseAmount + usageCost;
    const roundedTotal = Math.round(total * 100) / 100;

    if (roundedTotal < MIN_BILLABLE_AMOUNT) {
      if (options?.skipIfNoBillableAmount) {
        return;
      }
      throw new BadRequestException('No billable amount since last invoice');
    }

    return await this.invoiceNinjaService.createInvoiceForSubscription(
      subscriptionId,
      userId,
      roundedTotal,
      description,
    );
  }

  private extractUsageCost(payload: Record<string, unknown>): number {
    const direct = this.parseNumeric(payload['totalCost']) ?? this.parseNumeric(payload['usageCost']);
    if (direct !== null) {
      return direct;
    }

    const units = this.parseNumeric(payload['units']);
    const unitPrice = this.parseNumeric(payload['unitPrice']);
    if (units !== null && unitPrice !== null) {
      return units * unitPrice;
    }

    return 0;
  }

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private async calculateBaseAmountSinceLastBilling(
    subscription: SubscriptionEntity,
    plan: ServicePlanEntity,
    fullPeriodPrice: number,
    billUntil: Date,
    now: Date = new Date(),
  ): Promise<number> {
    const subscriptionStart = subscription.currentPeriodStart ?? subscription.createdAt ?? now;
    const subscriptionEndOrToday =
      subscription.cancelEffectiveAt && subscription.cancelEffectiveAt < now ? subscription.cancelEffectiveAt : now;

    let effectiveUntil = billUntil;
    if (effectiveUntil > subscriptionEndOrToday) {
      effectiveUntil = subscriptionEndOrToday;
    }

    if (effectiveUntil <= subscriptionStart) {
      return 0;
    }

    const latestInvoice = await this.invoiceRefsRepository.findLatestBySubscription(subscription.id);

    let lastBillingAt: Date | undefined = latestInvoice?.createdAt;
    if (!lastBillingAt) {
      lastBillingAt = subscription.currentPeriodStart ?? subscription.createdAt;
    }

    if (!lastBillingAt) {
      // Fallback: if we somehow have no timestamps, charge one full period.
      return fullPeriodPrice;
    }

    if (lastBillingAt < subscriptionStart) {
      lastBillingAt = subscriptionStart;
    }

    if (effectiveUntil <= lastBillingAt) {
      return 0;
    }

    let remainingMs = effectiveUntil.getTime() - lastBillingAt.getTime();
    let cursor = new Date(lastBillingAt);
    let amount = 0;
    let iterations = 0;
    const maxIterations = 1000;

    while (remainingMs > 0 && iterations < maxIterations) {
      iterations += 1;

      const schedule = this.billingScheduleService.calculateSchedule(
        plan.billingIntervalType as BillingIntervalType,
        plan.billingIntervalValue,
        plan.billingDayOfMonth,
        cursor,
      );

      const cycleEnd = schedule.currentPeriodEnd;
      if (!cycleEnd || cycleEnd <= cursor) {
        // Safety fallback: bill remaining time as a full period.
        amount += fullPeriodPrice;
        break;
      }

      const cycleMs = cycleEnd.getTime() - cursor.getTime();
      if (cycleMs <= 0) {
        break;
      }

      const segmentMs = Math.min(remainingMs, cycleMs);
      amount += fullPeriodPrice * (segmentMs / cycleMs);

      remainingMs -= segmentMs;
      cursor = cycleEnd;
    }

    return amount;
  }
}
