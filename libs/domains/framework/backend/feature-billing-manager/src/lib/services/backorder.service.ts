import { Injectable, Logger } from '@nestjs/common';
import { BackorderEntity, BackorderStatus } from '../entities/backorder.entity';
import { BackordersRepository } from '../repositories/backorders.repository';
import { AvailabilityService } from './availability.service';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { ServiceTypesRepository } from '../repositories/service-types.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';
import { SubscriptionStatus } from '../entities/subscription.entity';
import { BillingScheduleService } from './billing-schedule.service';
import { CloudflareDnsService } from './cloudflare-dns.service';
import { HostnameReservationService } from './hostname-reservation.service';
import { ProvisioningService } from './provisioning.service';

@Injectable()
export class BackorderService {
  private readonly logger = new Logger(BackorderService.name);

  constructor(
    private readonly backordersRepository: BackordersRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly serviceTypesRepository: ServiceTypesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionItemsRepository: SubscriptionItemsRepository,
    private readonly billingScheduleService: BillingScheduleService,
    private readonly provisioningService: ProvisioningService,
    private readonly hostnameReservationService: HostnameReservationService,
    private readonly cloudflareDnsService: CloudflareDnsService,
  ) {}

  async create(data: {
    userId: string;
    serviceTypeId: string;
    planId: string;
    requestedConfigSnapshot: Record<string, unknown>;
    providerErrors?: Record<string, unknown>;
    preferredAlternatives?: Record<string, unknown>;
  }): Promise<BackorderEntity> {
    return await this.backordersRepository.create({
      userId: data.userId,
      serviceTypeId: data.serviceTypeId,
      planId: data.planId,
      requestedConfigSnapshot: data.requestedConfigSnapshot,
      providerErrors: data.providerErrors ?? {},
      preferredAlternatives: data.preferredAlternatives ?? {},
      status: BackorderStatus.PENDING,
    });
  }

  async listForUser(userId: string, limit: number, offset: number): Promise<BackorderEntity[]> {
    return await this.backordersRepository.findAllByUser(userId, limit, offset);
  }

  async cancel(backorderId: string): Promise<BackorderEntity> {
    return await this.backordersRepository.update(backorderId, { status: BackorderStatus.CANCELLED });
  }

  async markRetrying(backorderId: string): Promise<BackorderEntity> {
    return await this.backordersRepository.update(backorderId, { status: BackorderStatus.RETRYING });
  }

  async retry(backorderId: string): Promise<BackorderEntity> {
    const backorder = await this.backordersRepository.findByIdOrThrow(backorderId);
    const plan = await this.servicePlansRepository.findByIdOrThrow(backorder.planId);
    const serviceType = await this.serviceTypesRepository.findByIdOrThrow(plan.serviceTypeId);

    const region = (backorder.requestedConfigSnapshot?.region as string | undefined) ?? 'fsn1';
    const serverType = (backorder.requestedConfigSnapshot?.serverType as string | undefined) ?? 'cx11';
    const availability = await this.availabilityService.checkAvailability(serviceType.provider, region, serverType);

    if (!availability.isAvailable) {
      return await this.backordersRepository.update(backorderId, {
        status: BackorderStatus.RETRYING,
        failureReason: availability.reason,
        preferredAlternatives: availability.alternatives ?? {},
      });
    }

    const schedule = this.billingScheduleService.calculateSchedule(
      plan.billingIntervalType,
      plan.billingIntervalValue,
      plan.billingDayOfMonth,
    );

    const subscription = await this.subscriptionsRepository.create({
      userId: backorder.userId,
      planId: backorder.planId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: schedule.currentPeriodStart,
      currentPeriodEnd: schedule.currentPeriodEnd,
      nextBillingAt: schedule.nextBillingAt,
    });

    const baseItem = await this.subscriptionItemsRepository.create({
      subscriptionId: subscription.id,
      serviceTypeId: plan.serviceTypeId,
      configSnapshot: backorder.requestedConfigSnapshot ?? {},
    });

    if (serviceType.provider === 'hetzner') {
      let hostname: string | null = null;
      try {
        hostname = await this.hostnameReservationService.reserveHostname(baseItem.id);
        const provisioningConfig = {
          name: hostname,
          serverType: (backorder.requestedConfigSnapshot?.serverType as string | undefined) ?? 'cx11',
          location: (backorder.requestedConfigSnapshot?.region as string | undefined) ?? 'fsn1',
          firewallId: backorder.requestedConfigSnapshot?.firewallId as number | undefined,
          userData: (backorder.requestedConfigSnapshot?.userData as string | undefined) ?? '',
        };
        const provisioned = await this.provisioningService.provision(serviceType.provider, provisioningConfig);
        if (provisioned?.serverId) {
          await this.subscriptionItemsRepository.updateProviderReference(baseItem.id, provisioned.serverId);
          await this.subscriptionItemsRepository.updateProvisioningStatus(baseItem.id, 'active');
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
            await this.hostnameReservationService.releaseHostname(baseItem.id);
          } catch (releaseError) {
            this.logger.warn(
              `Failed to release hostname after provisioning failure: ${(releaseError as Error).message}`,
            );
          }
        }
        await this.subscriptionItemsRepository.updateProvisioningStatus(baseItem.id, 'failed');
        throw error;
      }
    }

    return await this.backordersRepository.update(backorderId, { status: BackorderStatus.FULFILLED });
  }
}
