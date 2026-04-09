import { BadRequestException } from '@nestjs/common';

export function formatChatMessagesForAgent(messages: Array<{ role: string; content: string }>): string {
  return messages
    .map((m) => {
      const role = (m.role || 'user').toUpperCase();
      return `${role}:\n${m.content}`;
    })
    .join('\n\n');
}

export function normalizeOpenAiPrompt(prompt: unknown): string {
  if (typeof prompt === 'string') {
    return prompt;
  }
  if (Array.isArray(prompt)) {
    const parts = prompt.filter((p): p is string => typeof p === 'string');
    if (parts.length !== prompt.length) {
      throw new BadRequestException('prompt array must contain only strings');
    }
    return parts.join('');
  }
  throw new BadRequestException('prompt must be a string or array of strings');
}

/**
 * Best-effort extraction of text from OpenAI Responses API `input` (string or list of content items).
 */
export function normalizeResponsesInput(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  if (!Array.isArray(input)) {
    throw new BadRequestException('input must be a string or array');
  }
  const chunks: string[] = [];
  for (const item of input) {
    if (typeof item === 'string') {
      chunks.push(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      if (typeof o.text === 'string') {
        chunks.push(o.text);
        continue;
      }
      if (typeof o.content === 'string') {
        chunks.push(o.content);
        continue;
      }
      if (Array.isArray(o.content)) {
        for (const part of o.content) {
          if (typeof part === 'string') {
            chunks.push(part);
          } else if (part && typeof part === 'object') {
            const p = part as Record<string, unknown>;
            if (typeof p.text === 'string') {
              chunks.push(p.text);
            }
          }
        }
      }
    }
  }
  if (chunks.length === 0) {
    throw new BadRequestException('Could not extract text from input');
  }
  return chunks.join('\n');
}
