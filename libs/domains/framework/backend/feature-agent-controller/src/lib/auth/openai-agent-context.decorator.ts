import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { OPENAI_AGENT_CONTEXT_KEY, OpenAiAgentContext } from './openai-agent.types';

export const OpenAiAgentCtx = createParamDecorator((_data: unknown, ctx: ExecutionContext): OpenAiAgentContext => {
  const request = ctx.switchToHttp().getRequest<Request & { [OPENAI_AGENT_CONTEXT_KEY]?: OpenAiAgentContext }>();
  const value = request[OPENAI_AGENT_CONTEXT_KEY];
  if (!value) {
    throw new Error('OpenAiAgentContext missing; ensure OpenAiApiKeyGuard runs before this handler');
  }
  return value;
});
