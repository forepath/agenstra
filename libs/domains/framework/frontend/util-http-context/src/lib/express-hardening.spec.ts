jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

import { lookup } from 'node:dns/promises';

import { applyExpressServerHardening, applyExpressServerHardeningAsync } from './express-hardening';

const mockLookup = jest.mocked(lookup);

describe('applyExpressServerHardeningAsync', () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it('disables x-powered-by and sets trust proxy after resolving a hostname from env', async () => {
    mockLookup.mockResolvedValue({ address: '198.51.100.10', family: 4 });
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      disable(name: string) {
        calls.push({ method: 'disable', args: [name] });
      },
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    await applyExpressServerHardeningAsync(app, undefined, { EXPRESS_TRUST_PROXY: 'proxylb.example.com' });

    expect(calls).toContainEqual({ method: 'disable', args: ['x-powered-by'] });
    expect(calls).toContainEqual({ method: 'set', args: ['trust proxy', '198.51.100.10'] });
  });
});

describe('applyExpressServerHardening', () => {
  it('disables x-powered-by and does not set trust proxy by default', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      disable(name: string) {
        calls.push({ method: 'disable', args: [name] });
      },
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    applyExpressServerHardening(app, {}, {});

    expect(calls).toEqual([{ method: 'disable', args: ['x-powered-by'] }]);
  });

  it('sets trust proxy from options', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      disable(name: string) {
        calls.push({ method: 'disable', args: [name] });
      },
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    applyExpressServerHardening(app, { trustProxy: 2 }, {});

    expect(calls).toContainEqual({ method: 'disable', args: ['x-powered-by'] });
    expect(calls).toContainEqual({ method: 'set', args: ['trust proxy', 2] });
  });

  it('sets trust proxy from EXPRESS_TRUST_PROXY when options omit it', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const app = {
      disable(name: string) {
        calls.push({ method: 'disable', args: [name] });
      },
      set(name: string, value: unknown) {
        calls.push({ method: 'set', args: [name, value] });
      },
    };

    applyExpressServerHardening(app, undefined, { EXPRESS_TRUST_PROXY: 'true' });

    expect(calls).toContainEqual({ method: 'set', args: ['trust proxy', 1] });
  });

  it('throws when trust proxy env contains a hostname', () => {
    const app = {
      disable() {
        /* noop */
      },
      set() {
        /* noop */
      },
    };

    expect(() => applyExpressServerHardening(app, undefined, { EXPRESS_TRUST_PROXY: 'proxylb.example.com' })).toThrow(
      /applyExpressTrustProxyAsync/,
    );
  });
});
