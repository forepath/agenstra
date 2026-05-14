jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

import { lookup } from 'node:dns/promises';

import {
  applyExpressTrustProxy,
  applyExpressTrustProxyAsync,
  parseExpressTrustProxyFromEnv,
  resolveExpressTrustProxyValue,
  trustProxyValueRequiresDnsResolution,
} from './express-trust-proxy';

const mockLookup = jest.mocked(lookup);

describe('trustProxyValueRequiresDnsResolution', () => {
  it('is false for hop shorthands and IP lists', () => {
    expect(trustProxyValueRequiresDnsResolution('')).toBe(false);
    expect(trustProxyValueRequiresDnsResolution('true')).toBe(false);
    expect(trustProxyValueRequiresDnsResolution('2')).toBe(false);
    expect(trustProxyValueRequiresDnsResolution('10.0.0.1, 10.0.0.2')).toBe(false);
    expect(trustProxyValueRequiresDnsResolution('loopback, uniquelocal')).toBe(false);
    expect(trustProxyValueRequiresDnsResolution('2001:db8::1')).toBe(false);
    expect(trustProxyValueRequiresDnsResolution('10.0.0.0/8')).toBe(false);
  });

  it('is true when a hostname appears in the list', () => {
    expect(trustProxyValueRequiresDnsResolution('proxylb.example.com')).toBe(true);
    expect(trustProxyValueRequiresDnsResolution('10.0.0.1, proxylb.example.com')).toBe(true);
  });
});

describe('parseExpressTrustProxyFromEnv', () => {
  it('returns undefined for blank or unset', () => {
    expect(parseExpressTrustProxyFromEnv(undefined)).toBeUndefined();
    expect(parseExpressTrustProxyFromEnv('')).toBeUndefined();
    expect(parseExpressTrustProxyFromEnv('  ')).toBeUndefined();
  });

  it('maps common booleans to hop count or unset', () => {
    expect(parseExpressTrustProxyFromEnv('true')).toBe(1);
    expect(parseExpressTrustProxyFromEnv('1')).toBe(1);
    expect(parseExpressTrustProxyFromEnv('YES')).toBe(1);
    expect(parseExpressTrustProxyFromEnv('false')).toBeUndefined();
    expect(parseExpressTrustProxyFromEnv('0')).toBeUndefined();
    expect(parseExpressTrustProxyFromEnv('no')).toBeUndefined();
  });

  it('returns integer hop count for numeric strings', () => {
    expect(parseExpressTrustProxyFromEnv('2')).toBe(2);
  });

  it('returns trimmed string for Express-specific trust values', () => {
    expect(parseExpressTrustProxyFromEnv('loopback, linklocal, uniquelocal')).toBe('loopback, linklocal, uniquelocal');
  });

  it('returns trimmed string for a hostname (caller must use async hardening)', () => {
    expect(parseExpressTrustProxyFromEnv('ingress.internal')).toBe('ingress.internal');
  });
});

describe('resolveExpressTrustProxyValue', () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it('resolves a hostname to an IP for proxy-addr', async () => {
    mockLookup.mockResolvedValue({ address: '198.51.100.10', family: 4 });

    await expect(resolveExpressTrustProxyValue('proxylb.example.com')).resolves.toBe('198.51.100.10');
    expect(mockLookup).toHaveBeenCalledWith('proxylb.example.com', { verbatim: true });
  });

  it('resolves only hostname tokens in a comma-separated list', async () => {
    mockLookup.mockResolvedValue({ address: '198.51.100.10', family: 4 });

    await expect(resolveExpressTrustProxyValue('10.0.0.1, proxylb.example.com')).resolves.toBe(
      '10.0.0.1, 198.51.100.10',
    );
  });
});

describe('applyExpressTrustProxyAsync', () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it('sets trust proxy after resolving a hostname from env', async () => {
    mockLookup.mockResolvedValue({ address: '198.51.100.10', family: 4 });
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    await applyExpressTrustProxyAsync(app, undefined, { EXPRESS_TRUST_PROXY: 'proxylb.example.com' });

    expect(calls).toContainEqual({ method: 'set', args: ['trust proxy', '198.51.100.10'] });
  });
});

describe('applyExpressTrustProxy', () => {
  it('does not set trust proxy by default', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    applyExpressTrustProxy(app, {}, {});

    expect(calls).toEqual([]);
  });

  it('sets trust proxy from options', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    applyExpressTrustProxy(app, { trustProxy: 2 }, {});

    expect(calls).toContainEqual({ method: 'set', args: ['trust proxy', 2] });
  });

  it('sets trust proxy from EXPRESS_TRUST_PROXY when options omit it', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    applyExpressTrustProxy(app, undefined, { EXPRESS_TRUST_PROXY: 'true' });

    expect(calls).toContainEqual({ method: 'set', args: ['trust proxy', 1] });
  });

  it('throws when trust proxy env contains a hostname', () => {
    const app = {
      set() {
        /* noop */
      },
    };

    expect(() => applyExpressTrustProxy(app, undefined, { EXPRESS_TRUST_PROXY: 'proxylb.example.com' })).toThrow(
      /applyExpressTrustProxyAsync/,
    );
  });
});
