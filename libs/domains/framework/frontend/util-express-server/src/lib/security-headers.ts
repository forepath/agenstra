export interface SecurityHeadersEnv {
  CSP_ENFORCE?: string;
  CSP_CONNECT_SRC_EXTRA?: string;
  NODE_ENV?: string;
}

export function parseCspConnectSrcExtra(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  const tokens = raw
    .split(/[\s,]+/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const origins: string[] = [];

  for (const token of tokens) {
    try {
      const url = new URL(token);

      if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'ws:' && url.protocol !== 'wss:') {
        continue;
      }

      origins.push(url.origin);
    } catch {
      // Ignore invalid entries
    }
  }

  return origins;
}

function buildConnectSrc(env: SecurityHeadersEnv): string {
  const unencryptedProtocols = ['http:', 'ws:'];
  const connectSrcExtra = parseCspConnectSrcExtra(env.CSP_CONNECT_SRC_EXTRA);

  return [
    "'self'",
    'https:',
    'wss:',
    ...(env.NODE_ENV === 'production' ? [] : unencryptedProtocols),
    ...connectSrcExtra,
  ].join(' ');
}

function buildCspHeaderValue(env: SecurityHeadersEnv): string {
  const connectSrc = buildConnectSrc(env);

  return [
    "default-src 'self'",
    // Monaco and some tooling commonly require eval; keep report-only by default.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; ');
}

export type ExpressLikeResponse = {
  setHeader(name: string, value: string): void;
};

export type ExpressLikeNext = () => void;

export type ExpressLikeMiddleware = (req: unknown, res: ExpressLikeResponse, next: ExpressLikeNext) => void;

/**
 * Creates a security headers middleware shared across frontend Express servers.
 * Uses CSP in report-only mode by default; set CSP_ENFORCE=true to enforce.
 */
export function createSecurityHeadersMiddleware(env?: SecurityHeadersEnv): ExpressLikeMiddleware {
  const safeEnv = (env ?? (process.env as unknown as SecurityHeadersEnv)) as SecurityHeadersEnv;
  const enforceCsp = safeEnv.CSP_ENFORCE?.trim().toLowerCase() === 'true';
  const cspHeader = enforceCsp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
  const cspHeaderValue = buildCspHeaderValue(safeEnv);
  const isProduction = safeEnv.NODE_ENV === 'production';

  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader(cspHeader, cspHeaderValue);

    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    }

    next();
  };
}
