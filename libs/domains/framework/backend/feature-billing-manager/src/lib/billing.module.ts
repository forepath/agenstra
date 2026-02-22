import { getAuthenticationMethod, KeycloakService, UserEntity } from '@forepath/identity/backend';
import { EmailService } from '@forepath/shared/backend';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { AvailabilityController } from './controllers/availability.controller';
import { BackordersController } from './controllers/backorders.controller';
import { InvoicesController } from './controllers/invoices.controller';
import { PricingController } from './controllers/pricing.controller';
import { ServicePlansController } from './controllers/service-plans.controller';
import { ServiceTypesController } from './controllers/service-types.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { UsageController } from './controllers/usage.controller';
import { AvailabilitySnapshotEntity } from './entities/availability-snapshot.entity';
import { BackorderEntity } from './entities/backorder.entity';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { InvoiceRefEntity } from './entities/invoice-ref.entity';
import { ProviderPriceSnapshotEntity } from './entities/provider-price-snapshot.entity';
import { ServicePlanEntity } from './entities/service-plan.entity';
import { ServiceTypeEntity } from './entities/service-type.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { SubscriptionItemEntity } from './entities/subscription-item.entity';
import { UsageRecordEntity } from './entities/usage-record.entity';
import { AvailabilitySnapshotsRepository } from './repositories/availability-snapshots.repository';
import { BackordersRepository } from './repositories/backorders.repository';
import { InvoiceRefsRepository } from './repositories/invoice-refs.repository';
import { ProviderPriceSnapshotsRepository } from './repositories/provider-price-snapshots.repository';
import { ServicePlansRepository } from './repositories/service-plans.repository';
import { ServiceTypesRepository } from './repositories/service-types.repository';
import { SubscriptionItemsRepository } from './repositories/subscription-items.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { UsageRecordsRepository } from './repositories/usage-records.repository';
import { CustomerProfilesRepository } from './repositories/customer-profiles.repository';
import { AvailabilityService } from './services/availability.service';
import { BackorderService } from './services/backorder.service';
import { BackorderRetryService } from './services/backorder-retry.service';
import { BillingScheduleService } from './services/billing-schedule.service';
import { CancellationPolicyService } from './services/cancellation-policy.service';
import { HetznerProvisioningService } from './services/hetzner-provisioning.service';
import { InvoiceNinjaService } from './services/invoice-ninja.service';
import { InvoiceCreationService } from './services/invoice-creation.service';
import { PricingService } from './services/pricing.service';
import { ProviderPricingService } from './services/provider-pricing.service';
import { ProviderRegistryService } from './services/provider-registry.service';
import { ProviderServerTypesService } from './services/provider-server-types.service';
import { ProvisioningService } from './services/provisioning.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageService } from './services/usage.service';
import { CustomerProfilesService } from './services/customer-profiles.service';
import { CustomerProfilesController } from './controllers/customer-profiles.controller';
import { SubscriptionBillingScheduler } from './services/subscription-billing.scheduler';
import { SubscriptionExpirationScheduler } from './services/subscription-expiration.scheduler';
import { SubscriptionRenewalReminderScheduler } from './services/subscription-renewal-reminder.scheduler';

const authMethod = getAuthenticationMethod();

/**
 * Default config schema for Hetzner provisioning (serverType, location, optional firewallId).
 * Matches the shape expected by HetznerProvisioningService.provisionServer.
 * - basePriceFromField: when set, the UI fetches options from GET .../server-types and uses the selected option's price as plan base price.
 * - properties may include optional `enum` arrays for static options, or the field named in basePriceFromField gets options from the server-types API.
 */
const HETZNER_CONFIG_SCHEMA: Record<string, unknown> = {
  required: ['serverType', 'location'],
  basePriceFromField: 'serverType',
  properties: {
    serverType: {
      type: 'string',
      description: 'Hetzner server type (options and price from API)',
    },
    location: {
      type: 'string',
      description: 'Hetzner location',
      enum: ['fsn1', 'nbg1', 'hel1', 'ash', 'hil', 'sgp'],
    },
    firewallId: { type: 'number', description: 'Optional firewall ID to attach to server' },
  },
};

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceTypeEntity,
      ServicePlanEntity,
      SubscriptionEntity,
      SubscriptionItemEntity,
      UsageRecordEntity,
      InvoiceRefEntity,
      ProviderPriceSnapshotEntity,
      BackorderEntity,
      AvailabilitySnapshotEntity,
      CustomerProfileEntity,
      UserEntity,
    ]),
    ...(authMethod === 'keycloak' ? [KeycloakConnectModule.registerAsync({ useExisting: KeycloakService })] : []),
  ],
  controllers: [
    ServiceTypesController,
    ServicePlansController,
    AvailabilityController,
    SubscriptionsController,
    BackordersController,
    PricingController,
    InvoicesController,
    UsageController,
    CustomerProfilesController,
  ],
  providers: [
    AvailabilityService,
    BackorderService,
    BackorderRetryService,
    BillingScheduleService,
    CancellationPolicyService,
    HetznerProvisioningService,
    InvoiceNinjaService,
    ProviderRegistryService,
    ProviderServerTypesService,
    InvoiceCreationService,
    ProvisioningService,
    PricingService,
    ProviderPricingService,
    SubscriptionService,
    UsageService,
    CustomerProfilesService,
    SubscriptionBillingScheduler,
    SubscriptionExpirationScheduler,
    SubscriptionRenewalReminderScheduler,
    EmailService,
    AvailabilitySnapshotsRepository,
    BackordersRepository,
    InvoiceRefsRepository,
    ProviderPriceSnapshotsRepository,
    ServicePlansRepository,
    ServiceTypesRepository,
    SubscriptionItemsRepository,
    SubscriptionsRepository,
    UsageRecordsRepository,
    CustomerProfilesRepository,
  ],
  exports: [
    AvailabilityService,
    BackorderService,
    BackorderRetryService,
    BillingScheduleService,
    CancellationPolicyService,
    HetznerProvisioningService,
    InvoiceNinjaService,
    InvoiceCreationService,
    ProvisioningService,
    PricingService,
    ProviderPricingService,
    SubscriptionService,
    UsageService,
    CustomerProfilesService,
    SubscriptionBillingScheduler,
    SubscriptionExpirationScheduler,
    SubscriptionRenewalReminderScheduler,
    EmailService,
    AvailabilitySnapshotsRepository,
    BackordersRepository,
    InvoiceRefsRepository,
    ProviderPriceSnapshotsRepository,
    ServicePlansRepository,
    ServiceTypesRepository,
    SubscriptionItemsRepository,
    SubscriptionsRepository,
    UsageRecordsRepository,
    CustomerProfilesRepository,
    ProviderRegistryService,
  ],
})
export class BillingModule implements OnModuleInit {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  onModuleInit(): void {
    this.providerRegistry.register({
      id: 'hetzner',
      displayName: 'Hetzner Cloud',
      configSchema: HETZNER_CONFIG_SCHEMA,
    });
  }
}
