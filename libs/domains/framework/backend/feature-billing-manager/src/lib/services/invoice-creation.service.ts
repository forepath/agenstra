import { BadRequestException, Injectable } from '@nestjs/common';
import { InvoiceNinjaService } from './invoice-ninja.service';
import { PricingService } from './pricing.service';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { UsageRecordsRepository } from '../repositories/usage-records.repository';

@Injectable()
export class InvoiceCreationService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly pricingService: PricingService,
    private readonly invoiceNinjaService: InvoiceNinjaService,
    private readonly usageRecordsRepository: UsageRecordsRepository,
  ) {}

  async createInvoice(subscriptionId: string, userId: string, description?: string) {
    const subscription = await this.subscriptionsRepository.findByIdOrThrow(subscriptionId);
    if (subscription.userId !== userId) {
      throw new BadRequestException('Subscription does not belong to user');
    }

    const plan = await this.servicePlansRepository.findByIdOrThrow(subscription.planId);
    const pricing = this.pricingService.calculate(plan);
    const usage = await this.usageRecordsRepository.findLatestForSubscription(subscriptionId);
    const usageCost = usage ? this.extractUsageCost(usage.usagePayload) : 0;
    const total = pricing.totalPrice + usageCost;

    return await this.invoiceNinjaService.createInvoiceForSubscription(subscriptionId, userId, total, description);
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
}
