import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { createAes256GcmTransformer } from '@forepath/shared/backend';

/**
 * Stores credentials for agents created via proxied requests.
 * This enables subsequent socket event proxying using the saved password.
 */
@Entity('client_agent_credentials')
@Unique('uq_client_agent', ['clientId', 'agentId'])
export class ClientAgentCredentialEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId!: string;

  // Stored encrypted at rest (AES-256-GCM). Decrypted transparently via transformer.
  @Column({
    type: 'varchar',
    length: 2048,
    name: 'password',
    transformer: createAes256GcmTransformer(),
  })
  password!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
