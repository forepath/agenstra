import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientAgentOpenAiApiKeyEntity } from '../entities/client-agent-openai-api-key.entity';

@Injectable()
export class ClientAgentOpenAiApiKeysRepository {
  constructor(
    @InjectRepository(ClientAgentOpenAiApiKeyEntity)
    private readonly repository: Repository<ClientAgentOpenAiApiKeyEntity>,
  ) {}

  async findByApiKeyHash(apiKeyHash: string): Promise<ClientAgentOpenAiApiKeyEntity | null> {
    return await this.repository.findOne({ where: { apiKeyHash } });
  }

  async findByClientAndAgent(clientId: string, agentId: string): Promise<ClientAgentOpenAiApiKeyEntity | null> {
    return await this.repository.findOne({ where: { clientId, agentId } });
  }

  async save(entity: ClientAgentOpenAiApiKeyEntity): Promise<ClientAgentOpenAiApiKeyEntity> {
    return await this.repository.save(entity);
  }

  async create(
    dto: Pick<ClientAgentOpenAiApiKeyEntity, 'clientId' | 'agentId' | 'apiKeyEncrypted' | 'apiKeyHash'>,
  ): Promise<ClientAgentOpenAiApiKeyEntity> {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async deleteByClientAndAgent(clientId: string, agentId: string): Promise<void> {
    const existing = await this.findByClientAndAgent(clientId, agentId);
    if (existing) {
      await this.repository.remove(existing);
    }
  }
}
