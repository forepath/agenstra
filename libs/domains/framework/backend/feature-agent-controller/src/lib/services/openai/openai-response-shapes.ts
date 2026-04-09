import { randomUUID } from 'crypto';

export function openAiUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function newOpenAiId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export function buildChatCompletionChunk(params: {
  id: string;
  created: number;
  model: string;
  delta: Record<string, unknown>;
  finishReason?: string | null;
}): Record<string, unknown> {
  return {
    id: params.id,
    object: 'chat.completion.chunk',
    created: params.created,
    model: params.model,
    choices: [
      {
        index: 0,
        delta: params.delta,
        finish_reason: params.finishReason ?? null,
      },
    ],
  };
}

export function buildChatCompletion(params: {
  id: string;
  created: number;
  model: string;
  content: string;
}): Record<string, unknown> {
  return {
    id: params.id,
    object: 'chat.completion',
    created: params.created,
    model: params.model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: params.content, refusal: null },
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export function buildTextCompletion(params: {
  id: string;
  created: number;
  model: string;
  text: string;
}): Record<string, unknown> {
  return {
    id: params.id,
    object: 'text_completion',
    created: params.created,
    model: params.model,
    choices: [
      {
        text: params.text,
        index: 0,
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export function buildTextCompletionChunk(params: {
  id: string;
  created: number;
  model: string;
  text: string;
  finishReason?: string | null;
}): Record<string, unknown> {
  return {
    id: params.id,
    object: 'text_completion',
    created: params.created,
    model: params.model,
    choices: [
      {
        text: params.text,
        index: 0,
        finish_reason: params.finishReason ?? null,
        logprobs: null,
      },
    ],
  };
}

export function buildModelsList(params: { modelIds: string[] }): Record<string, unknown> {
  const created = openAiUnixTimestamp();
  return {
    object: 'list',
    data: params.modelIds.map((id) => ({
      id,
      object: 'model',
      created,
      owned_by: 'agenstra-agent',
    })),
  };
}

export function buildResponsesObject(params: {
  id: string;
  created: number;
  model: string;
  text: string;
}): Record<string, unknown> {
  return {
    id: params.id,
    object: 'response',
    created_at: params.created,
    model: params.model,
    status: 'completed',
    output_text: params.text,
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: params.text }],
      },
    ],
  };
}

export function buildResponsesStreamChunk(params: {
  id: string;
  model: string;
  delta: string;
}): Record<string, unknown> {
  return {
    type: 'response.output_text.delta',
    response_id: params.id,
    model: params.model,
    delta: params.delta,
  };
}
