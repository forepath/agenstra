import { createSecurityHeadersMiddleware, parseCspConnectSrcExtra } from './security-headers';

describe('parseCspConnectSrcExtra', () => {
  it('returns [] for undefined or blank', () => {
    expect(parseCspConnectSrcExtra(undefined)).toEqual([]);
    expect(parseCspConnectSrcExtra('  ')).toEqual([]);
  });

  it('returns URL origins for valid http(s)/ws(s) tokens', () => {
    expect(
      parseCspConnectSrcExtra('https://example.com/foo, wss://socket.example.com , http://localhost:3000'),
    ).toEqual(['https://example.com', 'wss://socket.example.com', 'http://localhost:3000']);
  });

  it('ignores invalid URLs and non-http protocols', () => {
    expect(parseCspConnectSrcExtra('not-a-url ftp://example.com https://ok.example')).toEqual(['https://ok.example']);
  });
});

describe('createSecurityHeadersMiddleware', () => {
  it('uses CSP report-only by default and includes http/ws connect-src in non-production', () => {
    const headers = new Map<string, string>();
    const middleware = createSecurityHeadersMiddleware({
      NODE_ENV: 'development',
      CSP_CONNECT_SRC_EXTRA: 'https://example.com',
    });

    middleware(
      {},
      {
        setHeader(name, value) {
          headers.set(name, value);
        },
      },
      () => undefined,
    );

    expect(headers.get('Content-Security-Policy-Report-Only')).toContain('connect-src');
    expect(headers.get('Content-Security-Policy-Report-Only')).toContain('http:');
    expect(headers.get('Content-Security-Policy-Report-Only')).toContain('ws:');
    expect(headers.get('Content-Security-Policy-Report-Only')).toContain('https://example.com');
    expect(headers.get('Content-Security-Policy-Report-Only')).toContain("worker-src 'self' blob:");
    expect(headers.get('Content-Security-Policy')).toBeUndefined();
  });

  it('uses CSP enforce when CSP_ENFORCE=true', () => {
    const headers = new Map<string, string>();
    const middleware = createSecurityHeadersMiddleware({
      NODE_ENV: 'development',
      CSP_ENFORCE: 'true',
    });

    middleware(
      {},
      {
        setHeader(name, value) {
          headers.set(name, value);
        },
      },
      () => undefined,
    );

    expect(headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(headers.get('Content-Security-Policy-Report-Only')).toBeUndefined();
  });

  it('adds production-only headers when NODE_ENV=production', () => {
    const headers = new Map<string, string>();
    const middleware = createSecurityHeadersMiddleware({
      NODE_ENV: 'production',
    });

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
