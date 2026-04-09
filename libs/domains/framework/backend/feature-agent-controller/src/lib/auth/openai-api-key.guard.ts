import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ClientAgentOpenAiApiKeysService } from '../services/client-agent-openai-api-keys.service';
import { OPENAI_AGENT_CONTEXT_KEY, OpenAiAgentContext } from './openai-agent.types';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2) {
    return null;
  }
  const [scheme, token] = parts;
  const s = scheme.toLowerCase();
  if (s !== 'bearer' && s !== 'apikey') {
    return null;
  }
  return token.trim() || null;
}

/**
 * Authenticates `/api/openai` using per-agent OpenAI-style keys (Bearer or ApiKey scheme).
 */
@Injectable()
export class OpenAiApiKeyGuard implements CanActivate {
  constructor(private readonly openAiApiKeysService: ClientAgentOpenAiApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const resolved = await this.openAiApiKeysService.resolveClientAndAgentByRawKey(token);
    if (!resolved) {
      throw new UnauthorizedException('Invalid API key');
    }
    const ctx: OpenAiAgentContext = { clientId: resolved.clientId, agentId: resolved.agentId };
    (req as Request & { [OPENAI_AGENT_CONTEXT_KEY]?: OpenAiAgentContext })[OPENAI_AGENT_CONTEXT_KEY] = ctx;
    return true;
  }
}
