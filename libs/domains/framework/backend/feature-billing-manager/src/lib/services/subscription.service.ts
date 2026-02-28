import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BackorderService } from './backorder.service';
import { BillingScheduleService } from './billing-schedule.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import { AvailabilityService } from './availability.service';
import { CloudflareDnsService } from './cloudflare-dns.service';
import { HostnameReservationService } from './hostname-reservation.service';
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
  private readonly logger = new Logger(SubscriptionService.name);

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
    private readonly hostnameReservationService: HostnameReservationService,
    private readonly cloudflareDnsService: CloudflareDnsService,
  ) {}

  async createSubscription(
    userId: string,
    planId: string,
    requestedConfig?: Record<string, unknown>,
    autoBackorder = false,
  ) {
    const plan = await this.servicePlansRepository.findByIdOrThrow(planId);
    const serviceType = await this.serviceTypesRepository.findByIdOrThrow(plan.serviceTypeId);

    const baseConfig = plan.providerConfigDefaults ?? {};
    const effectiveConfig: Record<string, unknown> = {
      ...(baseConfig || {}),
      ...(requestedConfig ?? {}),
    };

    const validationErrors = validateConfigSchema(serviceType.configSchema, effectiveConfig);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join('; '));
    }

    const region = (effectiveConfig.region as string | undefined) ?? 'fsn1';
    const serverType = (effectiveConfig.serverType as string | undefined) ?? 'cx11';
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
      configSnapshot: effectiveConfig,
    });

    if (serviceType.provider === 'hetzner') {
      let hostname: string | null = null;
      try {
        hostname = await this.hostnameReservationService.reserveHostname(subscriptionItem.id);
        const provisioningConfig = {
          name: hostname,
          serverType,
          location: region,
          firewallId: effectiveConfig.firewallId as number | undefined,
          userData: buildBillingCloudInitUserData({
            authenticationMethod: (effectiveConfig.authenticationMethod as string | undefined) ?? 'api-key',
            backendEnv: (effectiveConfig.backendEnv as Record<string, string> | undefined) ?? {},
            frontendEnv: (effectiveConfig.frontendEnv as Record<string, string> | undefined) ?? {},
          }),
        };

        const provisioned = await this.provisioningService.provision(serviceType.provider, provisioningConfig);
        if (provisioned?.serverId) {
          await this.subscriptionItemsRepository.updateProviderReference(subscriptionItem.id, provisioned.serverId);
          await this.subscriptionItemsRepository.updateProvisioningStatus(subscriptionItem.id, 'active');
          const serverInfo = await this.provisioningService.getServerInfo(serviceType.provider, provisioned.serverId);
          if (serverInfo?.publicIp) {
            try {
              await this.cloudflareDnsService.createARecord(hostname, serverInfo.publicIp);
            } catch (dnsError) {
              this.logger.warn(
                `DNS record creation failed for ${hostname}, server provisioned with IP ${serverInfo.publicIp}: ${(dnsError as Error).message}`,
              );
            }
          }
        }
      } catch (error) {
        if (hostname) {
          try {
            await this.hostnameReservationService.releaseHostname(subscriptionItem.id);
          } catch (releaseError) {
            this.logger.warn(
              `Failed to release hostname after provisioning failure: ${(releaseError as Error).message}`,
            );
          }
        }
        await this.subscriptionItemsRepository.updateProvisioningStatus(subscriptionItem.id, 'failed');
        if (autoBackorder) {
          await this.backorderService.create({
            userId,
            serviceTypeId: plan.serviceTypeId,
            planId,
            requestedConfigSnapshot: effectiveConfig,
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
        requestedConfigSnapshot: effectiveConfig,
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
