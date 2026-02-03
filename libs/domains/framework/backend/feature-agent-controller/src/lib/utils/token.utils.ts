import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const BCRYPT_ROUNDS = 12;
const TOKEN_PART_LENGTH = 32;

/**
 * Creates a token that embeds the user ID for lookup.
 * Format: {base64url(userId)}.{randomPart}
 * Only the randomPart is hashed and stored; the userId enables lookup.
 */
export function createTokenWithUserId(userId: string): { token: string; hash: Promise<string> } {
  const randomPart = randomBytes(TOKEN_PART_LENGTH).toString('hex');
  const encodedUserId = Buffer.from(userId, 'utf8').toString('base64url');
  const token = `${encodedUserId}.${randomPart}`;
  const hash = bcrypt.hash(randomPart, BCRYPT_ROUNDS);
  return { token, hash };
}

/**
 * Validates a token against a stored bcrypt hash.
 * Parses token to extract userId and randomPart, then compares randomPart with hash.
 */
export async function validateTokenAgainstHash(
  token: string,
  storedHash: string | null | undefined,
): Promise<{ userId: string } | null> {
  if (!storedHash) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedUserId, randomPart] = parts;
  if (!encodedUserId || !randomPart) return null;

  let userId: string;
  try {
    userId = Buffer.from(encodedUserId, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const valid = await bcrypt.compare(randomPart, storedHash);
  if (!valid) return null;

  return { userId };
}
