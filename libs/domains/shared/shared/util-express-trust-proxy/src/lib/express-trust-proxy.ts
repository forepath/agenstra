import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type ExpressTrustProxyEnv = {
  EXPRESS_TRUST_PROXY?: string;
};

export interface ExpressTrustProxyOptions {
  /**
   * Passed to Express as `trust proxy`. When omitted, `EXPRESS_TRUST_PROXY` is used.
   * See [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html).
   *
   * - `boolean` / `number`: forwarded as-is (same semantics as Express).
   * - `string`: comma-separated list of hop count (digits only), single IPv4/IPv6, CIDR,
   *   IPv4+netmask, or named subnets `loopback` | `linklocal` | `uniquelocal`.
   *   Hostnames are resolved to IPs only in {@link applyExpressTrustProxyAsync}.
   */
  trustProxy?: boolean | number | string;
}

export type ExpressTrustProxyAppLike = {
  set(setting: string, value: unknown): unknown;
};

const NAMED_TRUST_SUBNETS = new Set(['loopback', 'linklocal', 'uniquelocal']);

function trustProxyTokenTrustableWithoutDns(token: string): boolean {
  const trimmed = token.trim();

  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (NAMED_TRUST_SUBNETS.has(lower)) {
    return true;
  }

  const slash = trimmed.indexOf('/');

  if (slash !== -1) {
    const left = trimmed.slice(0, slash);
    const right = trimmed.slice(slash + 1);

    if (isIP(left) === 0) {
      return false;
    }

    if (/^\d+$/.test(right)) {
      return true;
    }

    return isIP(right) !== 0;
  }

  return isIP(trimmed) !== 0;
}

/**
 * Returns true when the value contains a hostname or other token that Express/proxy-addr
 * cannot compile without prior DNS resolution (see `trustProxyTokenTrustableWithoutDns`).
 */
export function trustProxyValueRequiresDnsResolution(raw: string): boolean {
  const trimmed = raw.trim();

  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }

  if (/^\d+$/.test(trimmed)) {
    return false;
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return parts.some((p) => !trustProxyTokenTrustableWithoutDns(p));
}

async function resolveTrustProxyToken(token: string): Promise<string> {
  const trimmed = token.trim();

  if (!trimmed) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();

  if (NAMED_TRUST_SUBNETS.has(lower)) {
    return lower;
  }

  if (trustProxyTokenTrustableWithoutDns(trimmed)) {
    return trimmed;
  }

  const { address } = await lookup(trimmed, { verbatim: true });

  if (isIP(address) === 0) {
    throw new TypeError(`DNS for trust proxy resolved to a non-IP value for host: ${trimmed}`);
  }

  return address;
}

/**
 * Parses `EXPRESS_TRUST_PROXY`: `true` / `1` / `yes` → hop count `1`; `false` / `0` / `no` → unset;
 * all-digit string → hop count; otherwise returns the trimmed string for Express subnet / IP lists.
 *
 * Strings that include hostnames must be resolved with {@link resolveExpressTrustProxyValue}
 * (async) before calling `app.set('trust proxy', …)` — use {@link applyExpressTrustProxyAsync}.
 */
export function parseExpressTrustProxyFromEnv(raw: string | undefined): boolean | number | string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return 1;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return undefined;
  }

  const trimmed = raw.trim();

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  return trimmed;
}

/**
 * Same interpretation as {@link parseExpressTrustProxyFromEnv}, but resolves hostnames in
 * comma-separated trust lists via DNS (first address returned per name).
 */
export async function resolveExpressTrustProxyValue(
  raw: string | undefined,
): Promise<boolean | number | string | undefined> {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return 1;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return undefined;
  }

  const trimmed = raw.trim();

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const resolved = await Promise.all(parts.map((p) => resolveTrustProxyToken(p)));

  return resolved.join(', ');
}

/**
 * Sets Express `trust proxy` from `EXPRESS_TRUST_PROXY` or options. Does not disable `X-Powered-By`.
 * Does not resolve DNS for hostnames — use {@link applyExpressTrustProxyAsync}.
 */
export function applyExpressTrustProxy(
  app: ExpressTrustProxyAppLike,
  options?: ExpressTrustProxyOptions,
  env: ExpressTrustProxyEnv = process.env as ExpressTrustProxyEnv,
): void {
  let trust: boolean | number | string | undefined;

  if (options?.trustProxy !== undefined) {
    trust = options.trustProxy;
  } else {
    trust = parseExpressTrustProxyFromEnv(env.EXPRESS_TRUST_PROXY);
  }

  if (typeof trust === 'string' && trustProxyValueRequiresDnsResolution(trust)) {
    throw new Error(
      'trust proxy value contains a hostname or unsupported token for synchronous setup. ' +
        'Use applyExpressTrustProxyAsync() so hostnames can be resolved to IP addresses, ' +
        'or use IPs, CIDRs, or named subnets (loopback, linklocal, uniquelocal). ' +
        'See https://expressjs.com/en/guide/behind-proxies.html',
    );
  }

  if (trust !== undefined && trust !== false) {
    app.set('trust proxy', trust);
  }
}

/**
 * Like {@link applyExpressTrustProxy}, but resolves hostnames in string `trustProxy` /
 * `EXPRESS_TRUST_PROXY` via DNS before calling `app.set('trust proxy', …)`.
 */
export async function applyExpressTrustProxyAsync(
  app: ExpressTrustProxyAppLike,
  options?: ExpressTrustProxyOptions,
  env: ExpressTrustProxyEnv = process.env as ExpressTrustProxyEnv,
): Promise<void> {
  let trust: boolean | number | string | undefined;

  if (options?.trustProxy !== undefined) {
    if (typeof options.trustProxy === 'string') {
      trust = await resolveExpressTrustProxyValue(options.trustProxy);
    } else {
      trust = options.trustProxy;
    }
  } else {
    trust = await resolveExpressTrustProxyValue(env.EXPRESS_TRUST_PROXY);
  }

  if (trust !== undefined && trust !== false) {
    app.set('trust proxy', trust);
  }
}
