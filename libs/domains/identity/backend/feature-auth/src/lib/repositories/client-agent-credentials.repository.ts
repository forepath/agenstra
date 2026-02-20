import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientAgentCredentialEntity } from '../entities/client-agent-credential.entity';

@Injectable()
export class ClientAgentCredentialsRepository {
  constructor(
    @InjectRepository(ClientAgentCredentialEntity)
    private readonly repository: Repository<ClientAgentCredentialEntity>,
  ) {}

  async create(dto: Pick<ClientAgentCredentialEntity, 'clientId' | 'agentId' | 'password'>) {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async findByClientAndAgent(clientId: string, agentId: string) {
    return await this.repository.findOne({ where: { clientId, agentId } });
  }

  async deleteByClientAndAgent(clientId: string, agentId: string): Promise<void> {
    const existing = await this.findByClientAndAgent(clientId, agentId);
    if (existing) {
      await this.repository.remove(existing);
    }
  }
}
