import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX = 'agenstra_oai_';

/**
 * Generate a new opaque OpenAI-style API key (prefix + random base64url).
 */
export function generateOpenAiStyleApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
}

/**
 * SHA-256 hex digest of the UTF-8 key string.
 */
export function hashOpenAiApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey, 'utf8').digest('hex');
}
