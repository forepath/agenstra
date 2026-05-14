import type { INestApplication } from '@nestjs/common';
import {
  applyExpressTrustProxyAsync,
  type ExpressTrustProxyEnv,
  type ExpressTrustProxyOptions,
} from '@forepath/shared/shared/util-express-trust-proxy';

export type NestHttpHardeningEnv = ExpressTrustProxyEnv & {
  NODE_ENV?: string;
};

export type NestApiSecurityHeadersEnv = {
  NODE_ENV?: string;
};

export type ExpressLikeResponse = {
  setHeader(name: string, value: string): void;
};

export type ExpressLikeNext = () => void;

/**
 * Baseline response headers for Nest HTTP APIs (no CSP — browsers are not the primary client).
 * Install with {@link useNestApiSecurityHeadersMiddleware} **after** middleware that must run first
 * (for example {@link createCorrelationIdMiddleware}). Pairs with `EXPRESS_TRUST_PROXY`; see
 * [NestJS rate limiting — proxies](https://docs.nestjs.com/security/rate-limiting#proxies).
 */
export function createNestApiSecurityHeadersMiddleware(
  env: NestApiSecurityHeadersEnv = process.env as NestApiSecurityHeadersEnv,
): (req: unknown, res: ExpressLikeResponse, next: ExpressLikeNext) => void {
  const isProduction = env.NODE_ENV === 'production';

  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    }

    next();
  };
}

type ExpressInstance = {
  disable(name: string): void;
  set(name: string, value: unknown): void;
  use(handler: unknown): void;
};

/**
 * When the default Express HTTP adapter is used: disables `X-Powered-By` and applies
 * `EXPRESS_TRUST_PROXY` (async; hostnames resolved at startup). Call immediately after
 * `NestFactory.create`, **before** `app.listen` and before middleware that relies on `req.ip`
 * / forwarded headers. No-op for non-Express adapters (for example Fastify).
 */
export async function applyNestExpressTrustProxyAndFingerprintAsync(
  app: INestApplication,
  options?: ExpressTrustProxyOptions,
  env: NestHttpHardeningEnv = process.env as NestHttpHardeningEnv,
): Promise<void> {
  const adapter = app.getHttpAdapter();

  if (adapter.getType() !== 'express') {
    return;
  }

  const expressApp = adapter.getInstance() as ExpressInstance;

  expressApp.disable('x-powered-by');
  await applyExpressTrustProxyAsync(expressApp, options, env);
}

/**
 * Registers {@link createNestApiSecurityHeadersMiddleware} on the Express instance.
 * Call **after** middleware that must run first on the request (for example correlation id).
 */
export function useNestApiSecurityHeadersMiddleware(
  app: INestApplication,
  env: NestApiSecurityHeadersEnv = process.env as NestApiSecurityHeadersEnv,
): void {
  const adapter = app.getHttpAdapter();

  if (adapter.getType() !== 'express') {
    return;
  }

  const expressApp = adapter.getInstance() as ExpressInstance;

  expressApp.use(createNestApiSecurityHeadersMiddleware(env));
}
