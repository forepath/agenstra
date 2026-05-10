import {
  applyExpressTrustProxy,
  applyExpressTrustProxyAsync,
  type ExpressTrustProxyEnv,
  type ExpressTrustProxyOptions,
} from '@forepath/shared/shared/util-express-trust-proxy';

export type ExpressHardeningEnv = ExpressTrustProxyEnv;

export type ExpressHardeningOptions = ExpressTrustProxyOptions;

type ExpressAppLike = {
  disable(setting: string): unknown;
  set(setting: string, value: unknown): unknown;
};

/**
 * Baseline Express hardening for static/SSR frontends: hide implementation details and
 * optionally trust reverse proxies. Pair with `createSecurityHeadersMiddleware` from this library.
 *
 * Does not resolve DNS for hostnames in `EXPRESS_TRUST_PROXY` — use
 * {@link applyExpressServerHardeningAsync} instead.
 */
export function applyExpressServerHardening(
  app: ExpressAppLike,
  options?: ExpressHardeningOptions,
  env: ExpressHardeningEnv = process.env as ExpressHardeningEnv,
): void {
  app.disable('x-powered-by');
  applyExpressTrustProxy(app, options, env);
}

/**
 * Like {@link applyExpressServerHardening}, but resolves hostnames in string `trustProxy` /
 * `EXPRESS_TRUST_PROXY` via DNS before calling `app.set('trust proxy', …)`.
 */
export async function applyExpressServerHardeningAsync(
  app: ExpressAppLike,
  options?: ExpressHardeningOptions,
  env: ExpressHardeningEnv = process.env as ExpressHardeningEnv,
): Promise<void> {
  app.disable('x-powered-by');
  await applyExpressTrustProxyAsync(app, options, env);
}
