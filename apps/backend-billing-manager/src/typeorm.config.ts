import {
  AvailabilitySnapshotEntity,
  BackorderEntity,
  CustomerProfileEntity,
  InvoiceRefEntity,
  ProviderPriceSnapshotEntity,
  ServicePlanEntity,
  ServiceTypeEntity,
  SubscriptionEntity,
  SubscriptionItemEntity,
  UsageRecordEntity,
} from '@forepath/framework/backend';
import { UserEntity } from '@forepath/identity/backend';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Shared TypeORM configuration used by both NestJS app and CLI migrations.
 * This ensures consistent database configuration across all contexts.
 *
 * Note: synchronize: true enables automatic schema synchronization from entities.
 * This is different from migrations - synchronize auto-creates/updates schema,
 * while migrations run SQL files. If using migrations, set synchronize: false.
 */
export const typeormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'billing',
  entities: [
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
  ],
  migrations: [
    'src/migrations/*.js',
    'apps/backend-billing-manager/src/migrations/*.ts',
    'libs/domains/identity/backend/util-auth/src/lib/migrations/*.ts',
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

/**
 * TypeORM DataSource configuration for CLI operations.
 * This file is used by TypeORM CLI for generating and running migrations.
 */
export default new DataSource(typeormConfig);
