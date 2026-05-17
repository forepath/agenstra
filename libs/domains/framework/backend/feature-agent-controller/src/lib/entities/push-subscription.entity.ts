import { UserEntity } from '@forepath/identity/backend';
import { createAes256GcmTransformer } from '@forepath/shared/backend';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Web Push subscription per user/device.
 * `endpoint`, `p256dh`, and `auth` are AES-256-GCM encrypted at rest (`text` columns).
 * `endpoint_hash` is a SHA-256 hex digest of the plaintext endpoint for unique constraints and lookups.
 */
@Entity('push_subscriptions')
@Index(['userId', 'endpointHash'], { unique: true })
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    type: 'text',
    transformer: createAes256GcmTransformer(),
  })
  endpoint!: string;

  @Column({ type: 'varchar', length: 64, name: 'endpoint_hash' })
  endpointHash!: string;

  @Column({
    type: 'text',
    name: 'p256dh',
    transformer: createAes256GcmTransformer(),
  })
  p256dh!: string;

  @Column({
    type: 'text',
    transformer: createAes256GcmTransformer(),
  })
  auth!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_agent' })
  userAgent?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
