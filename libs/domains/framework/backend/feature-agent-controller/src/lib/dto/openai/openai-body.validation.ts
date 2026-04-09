import { BadRequestException } from '@nestjs/common';

export interface ParsedChatMessage {
  role: string;
  content: string;
}

export function parseChatCompletionsBody(body: unknown): {
  model: string;
  messages: ParsedChatMessage[];
  stream: boolean;
} {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Invalid JSON body');
  }
  const o = body as Record<string, unknown>;
  if (typeof o.model !== 'string' || !o.model.trim()) {
    throw new BadRequestException('model is required');
  }
  if (!Array.isArray(o.messages) || o.messages.length === 0) {
    throw new BadRequestException('messages must be a non-empty array');
  }
  const messages: ParsedChatMessage[] = [];
  for (const m of o.messages) {
    if (!m || typeof m !== 'object') {
      throw new BadRequestException('Each message must be an object');
    }
    const msg = m as Record<string, unknown>;
    if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      throw new BadRequestException('Each message must have string role and string content');
    }
    messages.push({ role: msg.role, content: msg.content });
  }
  return {
    model: o.model.trim(),
    messages,
    stream: o.stream === true,
  };
}

export function parseCompletionsBody(body: unknown): { model: string; stream: boolean; prompt: unknown } {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Invalid JSON body');
  }
  const o = body as Record<string, unknown>;
  if (typeof o.model !== 'string' || !o.model.trim()) {
    throw new BadRequestException('model is required');
  }
  if (o.prompt === undefined) {
    throw new BadRequestException('prompt is required');
  }
  return {
    model: o.model.trim(),
    stream: o.stream === true,
    prompt: o.prompt,
  };
}

export function parseResponsesBody(body: unknown): { model: string; stream: boolean; input: unknown } {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Invalid JSON body');
  }
  const o = body as Record<string, unknown>;
  if (typeof o.model !== 'string' || !o.model.trim()) {
    throw new BadRequestException('model is required');
  }
  if (o.input === undefined) {
    throw new BadRequestException('input is required');
  }
  return {
    model: o.model.trim(),
    stream: o.stream === true,
    input: o.input,
  };
}
