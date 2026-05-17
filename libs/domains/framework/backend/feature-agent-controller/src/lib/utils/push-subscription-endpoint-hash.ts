import { createHash } from 'crypto';

/** Deterministic SHA-256 hex digest for indexed lookup of encrypted push endpoints. */
export function hashPushSubscriptionEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint, 'utf8').digest('hex');
}
