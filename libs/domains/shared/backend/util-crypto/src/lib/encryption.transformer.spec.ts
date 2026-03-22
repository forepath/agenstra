import {
  assertProductionEncryptionKeyOrExit,
  createAes256GcmTransformer,
  createJsonAes256GcmTransformer,
} from './encryption.transformer';

describe('assertProductionEncryptionKeyOrExit', () => {
  const ORIGINAL_ENV = process.env;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => undefined) as never);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    exitSpy.mockRestore();
  });

  it('does nothing when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENCRYPTION_KEY = '';

    assertProductionEncryptionKeyOrExit();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits when NODE_ENV is production and ENCRYPTION_KEY is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENCRYPTION_KEY = '';

    assertProductionEncryptionKeyOrExit();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when NODE_ENV is production and ENCRYPTION_KEY is not 32 bytes after base64 decode', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENCRYPTION_KEY = Buffer.from('short').toString('base64');

    assertProductionEncryptionKeyOrExit();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not exit when NODE_ENV is production and ENCRYPTION_KEY is valid', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENCRYPTION_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString('base64');

    assertProductionEncryptionKeyOrExit();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});

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

describe('createJsonAes256GcmTransformer', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should encrypt and decrypt a JSON object (round-trip)', () => {
    const transformer = createJsonAes256GcmTransformer();
    const obj = { region: 'fsn1', serverType: 'cx11', service: 'controller' };

    const stored = transformer.to(obj);
    expect(stored).toBeTruthy();
    expect(typeof stored).toBe('string');
    expect(stored).not.toContain('fsn1');

    const decrypted = transformer.from(stored!);
    expect(decrypted).toEqual(obj);
  });

  it('should return {} for null/undefined stored value', () => {
    const transformer = createJsonAes256GcmTransformer();
    expect(transformer.from(null)).toEqual({});
    expect(transformer.from(undefined)).toEqual({});
  });

  it('should return null from to() for null/undefined input', () => {
    const transformer = createJsonAes256GcmTransformer();
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeNull();
  });
});
