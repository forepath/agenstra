import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { createAes256GcmTransformer } from '../utils/encryption.transformer';
import { ClientUserEntity } from './client-user.entity';
import { UserEntity } from './user.entity';

export enum AuthenticationType {
  API_KEY = 'api_key',
  KEYCLOAK = 'keycloak',
}

/**
 * Client entity representing a client in the system.
 * Each agent has a unique UUID identifier, name, description, and hashed password.
 */
@Entity('clients')
export class ClientEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'varchar', length: 255, name: 'endpoint' })
  endpoint!: string;

  @Column({ type: 'enum', enum: AuthenticationType, name: 'authentication_type' })
  authenticationType!: AuthenticationType;

  @Column({
    type: 'varchar',
    length: 1024,
    nullable: true,
    name: 'api_key',
    transformer: createAes256GcmTransformer(),
  })
  apiKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'keycloak_client_id' })
  keycloakClientId?: string;

  @Column({
    type: 'varchar',
    length: 1024,
    nullable: true,
    name: 'keycloak_client_secret',
    transformer: createAes256GcmTransformer(),
  })
  keycloakClientSecret?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'keycloak_realm' })
  keycloakRealm?: string;

  @Column({ type: 'int', nullable: true, name: 'agent_ws_port' })
  agentWsPort?: number;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @OneToMany(() => ClientUserEntity, (clientUser) => clientUser.client)
  clientUsers?: ClientUserEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
