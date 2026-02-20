import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum ClientUserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * ClientUser entity representing a many-to-many relationship between users and clients.
 * Each relationship has a role (admin or user) that describes the user's permissions
 * for that specific client.
 *
 * Note: The ClientEntity relation is intentionally omitted here to avoid a circular
 * dependency between util-auth and feature-auth. The full entity with client relation
 * is in the feature-auth library.
 */
@Entity('client_users')
export class ClientUserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @Column({ type: 'enum', enum: ClientUserRole, name: 'role', default: ClientUserRole.USER })
  role!: ClientUserRole;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
