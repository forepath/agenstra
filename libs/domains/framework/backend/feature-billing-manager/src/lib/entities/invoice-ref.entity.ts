import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SubscriptionEntity } from './subscription.entity';

@Entity('billing_invoice_refs')
export class InvoiceRefEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'invoice_number' })
  invoiceNumber?: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;

  @Column({ type: 'varchar', length: 255, name: 'invoice_ninja_id' })
  invoiceNinjaId!: string;

  @Column({ type: 'text', name: 'pre_auth_url' })
  preAuthUrl!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'status' })
  status?: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true, name: 'balance' })
  balance?: number;

  @Column({ type: 'date', nullable: true, name: 'due_date' })
  dueDate?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
