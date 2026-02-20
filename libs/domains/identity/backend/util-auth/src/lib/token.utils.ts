import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

const BCRYPT_ROUNDS = 12;
const CONFIRMATION_CODE_LENGTH = 6;
const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Creates a 6-character alphanumeric confirmation code (A-Z, 0-9).
 * Used for email confirmation and password reset.
 */
export function createConfirmationCode(): { code: string; hash: Promise<string> } {
  let code = '';
  for (let i = 0; i < CONFIRMATION_CODE_LENGTH; i++) {
    code += ALPHANUMERIC_CHARS[randomInt(0, ALPHANUMERIC_CHARS.length)];
  }
  const hash = bcrypt.hash(code, BCRYPT_ROUNDS);
  return { code, hash };
}

/**
 * Validates a 6-character alphanumeric confirmation code against a stored bcrypt hash.
 */
export async function validateConfirmationCode(code: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash || !/^[A-Z0-9]{6}$/.test(code)) return false;
  return bcrypt.compare(code, storedHash);
}
