import { createAes256GcmTransformer } from '@forepath/shared/backend';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * Stores per-agent OpenAI-compatible API keys for `/api/openai` access.
 * Plain keys are never stored; encrypted value uses AES-256-GCM via ENCRYPTION_KEY.
 * Lookup uses SHA-256 hex hash of the raw key.
 */
@Entity('client_agent_openai_api_keys')
@Unique('uq_openai_client_agent', ['clientId', 'agentId'])
@Unique('uq_openai_api_key_hash', ['apiKeyHash'])
export class ClientAgentOpenAiApiKeyEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId!: string;

  @Column({
    type: 'text',
    name: 'api_key_encrypted',
    transformer: createAes256GcmTransformer(),
  })
  apiKeyEncrypted!: string;

  /** SHA-256 hex digest of the raw API key (for O(1) lookup). */
  @Column({ type: 'varchar', length: 64, name: 'api_key_hash' })
  apiKeyHash!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
