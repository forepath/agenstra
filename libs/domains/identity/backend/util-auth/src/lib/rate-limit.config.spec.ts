import { getRateLimitConfig } from './rate-limit.config';

// Type guard to check if config is an object (not an array)
function isThrottlerConfigObject(
  config: unknown,
): config is { throttlers: Array<{ ttl: number; limit: number }>; errorMessage?: string } {
  return typeof config === 'object' && config !== null && !Array.isArray(config) && 'throttlers' in config;
}

describe('getRateLimitConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return disabled rate limiting in development when RATE_LIMIT_ENABLED is not set', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_LIMIT;

    const config = getRateLimitConfig();

    expect(isThrottlerConfigObject(config)).toBe(true);

    if (isThrottlerConfigObject(config)) {
      expect(Array.isArray(config.throttlers)).toBe(true);
      expect(config.throttlers).toHaveLength(1);
      expect(config.throttlers[0].limit).toBe(10000); // Very high limit (effectively disabled)
    }
  });

  it('should return enabled rate limiting in production by default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_LIMIT;

    const config = getRateLimitConfig();

    expect(isThrottlerConfigObject(config)).toBe(true);

    if (isThrottlerConfigObject(config)) {
      expect(Array.isArray(config.throttlers)).toBe(true);
      expect(config.throttlers).toHaveLength(1);
      expect(config.throttlers[0].ttl).toBe(60000); // 60 seconds in milliseconds
      expect(config.throttlers[0].limit).toBe(100); // Default limit
      expect(config.errorMessage).toBe('Too many requests, please try again later.');
    }
  });

  it('should respect RATE_LIMIT_ENABLED=true in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.RATE_LIMIT_ENABLED = 'true';
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_LIMIT;

    const config = getRateLimitConfig();

    expect(isThrottlerConfigObject(config)).toBe(true);

    if (isThrottlerConfigObject(config)) {
      expect(Array.isArray(config.throttlers)).toBe(true);
      expect(config.throttlers).toHaveLength(1);
      expect(config.throttlers[0].ttl).toBe(60000);
      expect(config.throttlers[0].limit).toBe(100);
    }
  });

  it('should respect RATE_LIMIT_ENABLED=false in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_ENABLED = 'false';
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_LIMIT;

    const config = getRateLimitConfig();

    expect(isThrottlerConfigObject(config)).toBe(true);

    if (isThrottlerConfigObject(config)) {
      expect(Array.isArray(config.throttlers)).toBe(true);
      expect(config.throttlers).toHaveLength(1);
      expect(config.throttlers[0].limit).toBe(10000); // Effectively disabled
    }
  });

  it('should use custom TTL and limit from environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_TTL = '120';
    process.env.RATE_LIMIT_LIMIT = '200';

    const config = getRateLimitConfig();

    expect(isThrottlerConfigObject(config)).toBe(true);

    if (isThrottlerConfigObject(config)) {
      expect(Array.isArray(config.throttlers)).toBe(true);
      expect(config.throttlers).toHaveLength(1);
      expect(config.throttlers[0].ttl).toBe(120000); // 120 seconds in milliseconds
      expect(config.throttlers[0].limit).toBe(200);
    }
  });
});
