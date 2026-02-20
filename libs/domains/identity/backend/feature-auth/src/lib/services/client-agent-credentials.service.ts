import { Injectable } from '@nestjs/common';
import { ClientAgentCredentialsRepository } from '../repositories/client-agent-credentials.repository';

@Injectable()
export class ClientAgentCredentialsService {
  constructor(private readonly repo: ClientAgentCredentialsRepository) {}

  async saveCredentials(clientId: string, agentId: string, password: string) {
    return await this.repo.create({ clientId, agentId, password });
  }

  async deleteCredentials(clientId: string, agentId: string): Promise<void> {
    await this.repo.deleteByClientAndAgent(clientId, agentId);
  }
}
