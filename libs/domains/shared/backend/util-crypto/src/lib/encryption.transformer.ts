import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

/**
 * Creates a ColumnTransformer that transparently encrypts/decrypts string values using AES-256-GCM.
 * - Encryption key is read from process.env.ENCRYPTION_KEY as base64 (32 bytes required).
 * - Stored format: base64(iv):base64(tag):base64(ciphertext)
 *
 * IMPORTANT: Ensure ENCRYPTION_KEY is set to a secure, random 32-byte value (base64 encoded) in production.
 */
export function createAes256GcmTransformer(): ValueTransformer {
  // Resolve encryption key (base64). In tests/dev, fall back to a deterministic key.
  const envKeyB64 = process.env.ENCRYPTION_KEY;
  let key: Buffer;
  if (envKeyB64 && envKeyB64.length > 0) {
    try {
      key = Buffer.from(envKeyB64, 'base64');
    } catch {
      throw new Error('ENCRYPTION_KEY must be base64-encoded');
    }
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must decode to 32 bytes (AES-256).');
    }
  } else {
    // deterministic fallback key for local development and tests only
    key = Buffer.alloc(32, 0x11);
  }

  return {
    to(plain?: string | null): string | null {
      if (plain == null) return plain as null;
      if (plain === '') return '';
      const iv = randomBytes(12); // 96-bit nonce recommended for GCM
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      // Store as iv:tag:data (all base64)
      return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
    },
    from(stored?: string | null): string | null {
      if (stored == null) return stored as null;
      if (stored === '') return '';
      const parts = stored.split(':');
      // If value is not in iv:tag:data format, assume it's legacy/plain and return as-is
      if (parts.length !== 3) {
        return stored;
      }
      const [ivB64, tagB64, dataB64] = parts;
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return decrypted.toString('utf8');
    },
  };
}
