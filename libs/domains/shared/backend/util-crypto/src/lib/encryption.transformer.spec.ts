import { createAes256GcmTransformer } from './encryption.transformer';

describe('createAes256GcmTransformer (AES-256-GCM)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should encrypt and decrypt (round-trip) with fallback key when ENCRYPTION_KEY is not set', () => {
    const transformer = createAes256GcmTransformer();
    const plaintext = 'super-secret-text';

    const stored = transformer.to(plaintext);
    expect(stored).toBeTruthy();
    expect(stored).not.toEqual(plaintext);
    expect(stored!.split(':')).toHaveLength(3); // iv:tag:data

    const decrypted = transformer.from(stored!);
    expect(decrypted).toEqual(plaintext);
  });

  it('should encrypt and decrypt (round-trip) with a provided ENCRYPTION_KEY', () => {
    // 32 random bytes in base64
    process.env.ENCRYPTION_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1)).toString('base64');
    const transformer = createAes256GcmTransformer();
    const plaintext = 'another-secret';

    const stored = transformer.to(plaintext);
    expect(stored).toBeTruthy();
    expect(stored).not.toEqual(plaintext);

    const decrypted = transformer.from(stored!);
    expect(decrypted).toEqual(plaintext);
  });

  it('should pass through legacy/plain values (no iv:tag:data format)', () => {
    const transformer = createAes256GcmTransformer();
    const legacy = 'plain-text-without-colons';
    const decrypted = transformer.from(legacy);
    expect(decrypted).toEqual(legacy);
  });

  it('should handle empty string and null/undefined values', () => {
    const transformer = createAes256GcmTransformer();
    expect(transformer.to('')).toEqual('');
    expect(transformer.from('')).toEqual('');
    expect(transformer.to(null as unknown as string)).toBeNull();
    expect(transformer.from(null as unknown as string)).toBeNull();
    expect(transformer.to(undefined as unknown as string)).toBeUndefined();
    expect(transformer.from(undefined as unknown as string)).toBeUndefined();
  });

  it('should throw when ENCRYPTION_KEY is invalid/incorrect after base64 decoding', () => {
    process.env.ENCRYPTION_KEY = '%%%not-base64%%%';
    // Node's Buffer.from will coerce invalid base64; we assert the 32-byte length guard
    expect(() => createAes256GcmTransformer()).toThrow('ENCRYPTION_KEY must decode to 32 bytes (AES-256).');
  });

  it('should throw when ENCRYPTION_KEY is not 32 bytes after decoding', () => {
    process.env.ENCRYPTION_KEY = Buffer.from('short-key').toString('base64'); // not 32 bytes
    expect(() => createAes256GcmTransformer()).toThrow('ENCRYPTION_KEY must decode to 32 bytes (AES-256).');
  });
});
