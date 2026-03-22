import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

export interface ProductionEncryptionKeyLogger {
  error(message: string): void;
}

/**
 * In production (`NODE_ENV === 'production'`), validates `ENCRYPTION_KEY` and exits the process if it is
 * missing or not a base64-encoded 32-byte key. No-op in non-production.
 *
 * Call once at application bootstrap before any code uses encrypted columns.
 */
export function assertProductionEncryptionKeyOrExit(logger?: ProductionEncryptionKeyLogger): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const logError = (message: string): void => {
    if (logger) {
      logger.error(message);
    } else {
      process.stderr.write(`${message}\n`);
    }
  };

  const rawKey = process.env.ENCRYPTION_KEY;
  const envKeyB64 = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (envKeyB64.length === 0) {
    logError('FATAL: ENCRYPTION_KEY must be set in production. Exiting.');
    process.exit(1);
  }

  const key = Buffer.from(envKeyB64, 'base64');
  if (key.length !== 32) {
    logError('FATAL: ENCRYPTION_KEY must be base64-encoded 32 bytes (AES-256) in production. Exiting.');
    process.exit(1);
  }
}

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

/**
 * Creates a ColumnTransformer that encrypts/decrypts a JSON object (Record<string, unknown>) using AES-256-GCM.
 * Serializes the object to JSON before encrypting; decrypts and parses on read.
 * Uses the same ENCRYPTION_KEY as createAes256GcmTransformer.
 */
export function createJsonAes256GcmTransformer(): ValueTransformer {
  const gcm = createAes256GcmTransformer();
  return {
    to(value: Record<string, unknown> | null | undefined): string | null {
      if (value == null) return null;
      const json = JSON.stringify(value);
      return gcm.to(json) as string | null;
    },
    from(stored: string | null | undefined): Record<string, unknown> {
      if (stored == null) return {};
      const dec = gcm.from(stored);
      if (dec == null || dec === '') return {};
      try {
        return JSON.parse(dec) as Record<string, unknown>;
      } catch {
        return {};
      }
    },
  };
}
