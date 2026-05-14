import type { INestApplication } from '@nestjs/common';

import {
  applyNestExpressTrustProxyAndFingerprintAsync,
  createNestApiSecurityHeadersMiddleware,
  useNestApiSecurityHeadersMiddleware,
} from './nest-http-hardening';

describe('createNestApiSecurityHeadersMiddleware', () => {
  it('sets baseline headers in development', () => {
    const headers = new Map<string, string>();
    const middleware = createNestApiSecurityHeadersMiddleware({ NODE_ENV: 'development' });

    middleware(
      {},
      {
        setHeader(name, value) {
          headers.set(name, value);
        },
      },
      () => undefined,
    );

    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-DNS-Prefetch-Control')).toBe('off');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(headers.get('Permissions-Policy')).toBe('geolocation=(), microphone=(), camera=()');
    expect(headers.get('Strict-Transport-Security')).toBeUndefined();
    expect(headers.get('Cross-Origin-Resource-Policy')).toBeUndefined();
  });

  it('adds HSTS and CORP in production', () => {
    const headers = new Map<string, string>();
    const middleware = createNestApiSecurityHeadersMiddleware({ NODE_ENV: 'production' });

    middleware(
      {},
      {
        setHeader(name, value) {
          headers.set(name, value);
        },
      },
      () => undefined,
    );

    expect(headers.get('Strict-Transport-Security')).toBe('max-age=15552000; includeSubDomains');
    expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-site');
  });
});

describe('applyNestExpressTrustProxyAndFingerprintAsync', () => {
  it('disables x-powered-by and sets trust proxy on the Express adapter', async () => {
    const expressInstance = {
      disable: jest.fn(),
      set: jest.fn(),
      use: jest.fn(),
    };
    const app = {
      getHttpAdapter: () => ({
        getType: () => 'express',
        getInstance: () => expressInstance,
      }),
    } as INestApplication;

    await applyNestExpressTrustProxyAndFingerprintAsync(app, { trustProxy: 1 }, {});

    expect(expressInstance.disable).toHaveBeenCalledWith('x-powered-by');
    expect(expressInstance.set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('is a no-op when the adapter is not Express', async () => {
    const app = {
      getHttpAdapter: () => ({
        getType: () => 'fastify',
        getInstance: () => ({}),
      }),
    } as INestApplication;

    await expect(applyNestExpressTrustProxyAndFingerprintAsync(app, { trustProxy: 1 }, {})).resolves.toBeUndefined();
  });
});

describe('useNestApiSecurityHeadersMiddleware', () => {
  it('registers security headers middleware on Express', () => {
    const expressInstance = {
      disable: jest.fn(),
      set: jest.fn(),
      use: jest.fn(),
    };
    const app = {
      getHttpAdapter: () => ({
        getType: () => 'express',
        getInstance: () => expressInstance,
      }),
    } as INestApplication;

    useNestApiSecurityHeadersMiddleware(app, { NODE_ENV: 'development' });

    expect(expressInstance.use).toHaveBeenCalledTimes(1);
    expect(typeof expressInstance.use.mock.calls[0][0]).toBe('function');
  });
});
