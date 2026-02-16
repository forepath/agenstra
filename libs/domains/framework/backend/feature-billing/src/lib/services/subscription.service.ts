import { BadRequestException, Injectable } from '@nestjs/common';
import { BackorderService } from './backorder.service';
import { BillingScheduleService } from './billing-schedule.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import { AvailabilityService } from './availability.service';
import { ProvisioningService } from './provisioning.service';
import { validateConfigSchema } from '../utils/config-validation.utils';
import { buildBillingCloudInitUserData } from '../utils/cloud-init.utils';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { ServiceTypesRepository } from '../repositories/service-types.repository';
import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { SubscriptionEntity, SubscriptionStatus } from '../entities/subscription.entity';
import { BillingIntervalType } from '../entities/service-plan.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly serviceTypesRepository: ServiceTypesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionItemsRepository: SubscriptionItemsRepository,
    private readonly billingScheduleService: BillingScheduleService,
    private readonly cancellationPolicyService: CancellationPolicyService,
    private readonly backorderService: BackorderService,
    private readonly availabilityService: AvailabilityService,
    private readonly provisioningService: ProvisioningService,
  ) {}

  async createSubscription(
    userId: string,
    planId: string,
    requestedConfig?: Record<string, unknown>,
    autoBackorder = false,
  ) {
    const plan = await this.servicePlansRepository.findByIdOrThrow(planId);
    const serviceType = await this.serviceTypesRepository.findByIdOrThrow(plan.serviceTypeId);
    const validationErrors = validateConfigSchema(serviceType.configSchema, requestedConfig ?? {});
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join('; '));
    }

    const region = (requestedConfig?.region as string | undefined) ?? 'fsn1';
    const serverType = (requestedConfig?.serverType as string | undefined) ?? 'cx11';
    const provider = serviceType.provider;
    const availability = await this.availabilityService.checkAvailability(provider, region, serverType);

    if (!availability.isAvailable) {
      if (autoBackorder) {
        await this.backorderService.create({
          userId,
          serviceTypeId: plan.serviceTypeId,
          planId,
          requestedConfigSnapshot: requestedConfig ?? {},
          providerErrors: { reason: availability.reason },
          preferredAlternatives: availability.alternatives ?? {},
        });
      }
      throw new BadRequestException(availability.reason || 'Configuration not available');
    }

    const schedule = this.billingScheduleService.calculateSchedule(
      plan.billingIntervalType as BillingIntervalType,
      plan.billingIntervalValue,
      plan.billingDayOfMonth,
    );

    const subscription = await this.subscriptionsRepository.create({
      userId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: schedule.currentPeriodStart,
      currentPeriodEnd: schedule.currentPeriodEnd,
      nextBillingAt: schedule.nextBillingAt,
    });

    const subscriptionItem = await this.subscriptionItemsRepository.create({
      subscriptionId: subscription.id,
      serviceTypeId: plan.serviceTypeId,
      configSnapshot: requestedConfig ?? {},
    });

    if (serviceType.provider === 'hetzner') {
      try {
        const provisioningConfig = {
          name: `subscription-${subscription.id}`,
          serverType: (requestedConfig?.serverType as string | undefined) ?? 'cx11',
          location: (requestedConfig?.region as string | undefined) ?? 'fsn1',
          firewallId: requestedConfig?.firewallId as number | undefined,
          userData: buildBillingCloudInitUserData({
            authenticationMethod: (requestedConfig?.authenticationMethod as string | undefined) ?? 'api-key',
            backendEnv: (requestedConfig?.backendEnv as Record<string, string> | undefined) ?? {},
            frontendEnv: (requestedConfig?.frontendEnv as Record<string, string> | undefined) ?? {},
          }),
        };

        const provisioned = await this.provisioningService.provision(serviceType.provider, provisioningConfig);
        if (provisioned?.serverId) {
          await this.subscriptionItemsRepository.updateProviderReference(subscriptionItem.id, provisioned.serverId);
          await this.subscriptionItemsRepository.updateProvisioningStatus(subscriptionItem.id, 'active');
        }
      } catch (error) {
        await this.subscriptionItemsRepository.updateProvisioningStatus(subscriptionItem.id, 'failed');
        if (autoBackorder) {
          await this.backorderService.create({
            userId,
            serviceTypeId: plan.serviceTypeId,
            planId,
            requestedConfigSnapshot: requestedConfig ?? {},
            providerErrors: { reason: (error as Error).message },
          });
        }
        throw error;
      }
    }

    if (autoBackorder) {
      await this.backorderService.create({
        userId,
        serviceTypeId: plan.serviceTypeId,
        planId,
        requestedConfigSnapshot: requestedConfig ?? {},
      });
    }

    return subscription;
  }

  async listSubscriptions(userId: string, limit: number, offset: number) {
    return await this.subscriptionsRepository.findAllByUser(userId, limit, offset);
  }

  async getSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.subscriptionsRepository.findByIdOrThrow(subscriptionId);
    if (subscription.userId !== userId) {
      throw new BadRequestException('Subscription does not belong to user');
    }
    return subscription;
  }

  async cancelSubscription(subscriptionId: string, userId: string): Promise<SubscriptionEntity> {
    const subscription = await this.getSubscription(subscriptionId, userId);
    const plan = await this.servicePlansRepository.findByIdOrThrow(subscription.planId);

    const decision = this.cancellationPolicyService.evaluate(
      subscription.createdAt,
      subscription.currentPeriodEnd,
      plan.cancelAtPeriodEnd,
      plan.minCommitmentDays,
      plan.noticeDays,
    );

    if (!decision.canCancel) {
      throw new BadRequestException(decision.reason || 'Cancellation not permitted');
    }

    return await this.subscriptionsRepository.update(subscriptionId, {
      status: SubscriptionStatus.PENDING_CANCEL,
      cancelRequestedAt: new Date(),
      cancelEffectiveAt: decision.effectiveAt,
    });
  }

  async resumeSubscription(subscriptionId: string, userId: string): Promise<SubscriptionEntity> {
    const subscription = await this.getSubscription(subscriptionId, userId);
    if (subscription.status !== SubscriptionStatus.PENDING_CANCEL) {
      throw new BadRequestException('Subscription is not pending cancel');
    }

    return await this.subscriptionsRepository.update(subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
      resumedAt: new Date(),
      cancelRequestedAt: null,
      cancelEffectiveAt: null,
    });
  }
}
