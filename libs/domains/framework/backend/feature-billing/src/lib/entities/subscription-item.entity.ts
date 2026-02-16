import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceTypeEntity } from './service-type.entity';
import { SubscriptionEntity } from './subscription.entity';

export enum ProvisioningStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  FAILED = 'failed',
}

@Entity('billing_subscription_items')
export class SubscriptionItemEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;

  @Column({ type: 'uuid', name: 'service_type_id' })
  serviceTypeId!: string;

  @ManyToOne(() => ServiceTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType?: ServiceTypeEntity;

  @Column({ type: 'jsonb', name: 'config_snapshot', default: () => "'{}'::jsonb" })
  configSnapshot!: Record<string, unknown>;

  @Column({ type: 'enum', enum: ProvisioningStatus, name: 'provisioning_status', default: ProvisioningStatus.PENDING })
  provisioningStatus!: ProvisioningStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_reference' })
  providerReference?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
