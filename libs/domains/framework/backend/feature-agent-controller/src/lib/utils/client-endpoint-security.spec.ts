import { BadRequestException } from '@nestjs/common';

import {
  assertClientEndpointHostnameResolvesToPublicIps,
  assertSafeClientEndpointOrThrow,
  validateClientEndpointWithDnsOrThrow,
} from './client-endpoint-security';

jest.mock('node:dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const dns = require('node:dns') as { promises: { lookup: jest.Mock } };

describe('client-endpoint-security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_ENDPOINT_ALLOWED_HOSTS = 'example.com,api.partner.test';
    delete process.env.CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP;
    delete process.env.CLIENT_ENDPOINT_SKIP_DNS_CHECK;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('assertSafeClientEndpointOrThrow', () => {
    it('accepts https URL with allowlisted host', () => {
      const url = assertSafeClientEndpointOrThrow('https://example.com/base');

      expect(url.hostname).toBe('example.com');
    });

    it('rejects host not in allowlist', () => {
      expect(() => assertSafeClientEndpointOrThrow('https://evil.com/x')).toThrow(BadRequestException);
    });
  });

  describe('assertClientEndpointHostnameResolvesToPublicIps', () => {
    it('rejects when DNS returns private IPv4', async () => {
      process.env.NODE_ENV = 'production';
      dns.promises.lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);

      await expect(assertClientEndpointHostnameResolvesToPublicIps('example.com')).rejects.toThrow(BadRequestException);
    });

    it('accepts when DNS returns public IP', async () => {
      process.env.NODE_ENV = 'production';
      dns.promises.lookup.mockResolvedValue([{ address: '203.0.113.1', family: 4 }]);

      await expect(assertClientEndpointHostnameResolvesToPublicIps('example.com')).resolves.toBeUndefined();
    });
  });

  describe('validateClientEndpointWithDnsOrThrow', () => {
    it('runs sync validation then DNS', async () => {
      process.env.NODE_ENV = 'production';
      dns.promises.lookup.mockResolvedValue([{ address: '198.51.100.2', family: 4 }]);

      const url = await validateClientEndpointWithDnsOrThrow('https://api.partner.test/');

      expect(url.hostname).toBe('api.partner.test');
      expect(dns.promises.lookup).toHaveBeenCalled();
    });
  });
});
