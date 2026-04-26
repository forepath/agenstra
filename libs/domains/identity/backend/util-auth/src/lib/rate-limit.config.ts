import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Get rate limiting configuration from environment variables.
 * Defaults to production-safe values if not specified.
 *
 * Environment variables:
 * - RATE_LIMIT_TTL: Time window in seconds (default: 60)
 * - RATE_LIMIT_LIMIT: Maximum number of requests per window (default: 100)
 * - RATE_LIMIT_ENABLED: Enable/disable rate limiting (default: true in production, false in development)
 */
export function getRateLimitConfig(): ThrottlerModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const rateLimitEnabled =
    process.env.RATE_LIMIT_ENABLED !== 'false' && (isProduction || process.env.RATE_LIMIT_ENABLED === 'true');
  const ttl = parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000; // Convert to milliseconds
  const limit = rateLimitEnabled ? parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10) : 10000; // Very high limit if disabled

  return {
    throttlers: [
      {
        ttl,
        limit,
      },
    ],
    errorMessage: 'Too many requests, please try again later.',
    // Custom storage (uses in-memory by default, can be configured for Redis in production)
    // storage: undefined, // Can be set to Redis storage for distributed systems
  };
}
