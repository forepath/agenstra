import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientAgentOpenAiApiKeysRepository } from '../repositories/client-agent-openai-api-keys.repository';
import { generateOpenAiStyleApiKey, hashOpenAiApiKey } from '../utils/openai-api-key-hash';

/**
 * Issues and resolves per-agent OpenAI-compatible API keys stored encrypted-at-rest.
 */
@Injectable()
export class ClientAgentOpenAiApiKeysService {
  private readonly logger = new Logger(ClientAgentOpenAiApiKeysService.name);

  constructor(private readonly repository: ClientAgentOpenAiApiKeysRepository) {}

  /**
   * Create a new key for the agent and return the plaintext once (caller must persist securely).
   */
  async issueKeyForNewAgent(clientId: string, agentId: string): Promise<string> {
    const existing = await this.repository.findByClientAndAgent(clientId, agentId);
    if (existing) {
      this.logger.warn(`OpenAI API key already exists for client ${clientId} agent ${agentId}; skipping issue`);
      return '';
    }
    return await this.createAndPersistKey(clientId, agentId);
  }

  /**
   * Rotate key: removes old row semantics by updating hash + encrypted value in place.
   */
  async rotateKey(clientId: string, agentId: string): Promise<string> {
    const existing = await this.repository.findByClientAndAgent(clientId, agentId);
    const plain = generateOpenAiStyleApiKey();
    const apiKeyHash = hashOpenAiApiKey(plain);
    if (existing) {
      existing.apiKeyEncrypted = plain;
      existing.apiKeyHash = apiKeyHash;
      await this.repository.save(existing);
    } else {
      await this.repository.create({ clientId, agentId, apiKeyEncrypted: plain, apiKeyHash });
    }
    return plain;
  }

  private async createAndPersistKey(clientId: string, agentId: string): Promise<string> {
    const plain = generateOpenAiStyleApiKey();
    const apiKeyHash = hashOpenAiApiKey(plain);
    await this.repository.create({ clientId, agentId, apiKeyEncrypted: plain, apiKeyHash });
    return plain;
  }

  async resolveClientAndAgentByRawKey(rawKey: string): Promise<{ clientId: string; agentId: string } | null> {
    const trimmed = rawKey?.trim();
    if (!trimmed) {
      return null;
    }
    const apiKeyHash = hashOpenAiApiKey(trimmed);
    const row = await this.repository.findByApiKeyHash(apiKeyHash);
    if (!row) {
      return null;
    }
    return { clientId: row.clientId, agentId: row.agentId };
  }

  /**
   * Ensure a key exists (for agents created before this feature). Returns plaintext only when newly created.
   */
  async ensureKeyExists(clientId: string, agentId: string): Promise<{ created: boolean; plainKey?: string }> {
    const existing = await this.repository.findByClientAndAgent(clientId, agentId);
    if (existing) {
      return { created: false };
    }
    const plain = await this.createAndPersistKey(clientId, agentId);
    return { created: true, plainKey: plain };
  }

  async assertKeyRowExists(clientId: string, agentId: string): Promise<void> {
    const row = await this.repository.findByClientAndAgent(clientId, agentId);
    if (!row) {
      throw new NotFoundException('No OpenAI API key configured for this agent; create or rotate a key first.');
    }
  }

  async deleteForAgent(clientId: string, agentId: string): Promise<void> {
    await this.repository.deleteByClientAndAgent(clientId, agentId);
  }
}
