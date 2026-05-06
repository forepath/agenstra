import { promises as dnsPromises } from 'node:dns';
import * as net from 'node:net';

/** @internal exported for unit tests */
export function parseAllowedHosts(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }

  if (net.isIP(host)) {
    return isPrivateOrLoopbackIp(host);
  }

  return false;
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('169.254.') || ip.startsWith('192.168.')) {
      return true;
    }

    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      const second = Number(parts[1]);

      return Number.isFinite(second) && second >= 16 && second <= 31;
    }

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    if (normalized === '::1') {
      return true;
    }

    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }

    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
  }

  return false;
}

const DEV_SELF_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isDevSelfHost(hostname: string): boolean {
  return DEV_SELF_HOSTS.has(hostname.trim().toLowerCase());
}

function countJsonKeys(value: unknown, depth: number, maxDepth: number): number {
  if (depth > maxDepth || value === null || typeof value !== 'object') {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + countJsonKeys(item, depth + 1, maxDepth), 0);
  }

  const record = value as Record<string, unknown>;

  return Object.keys(record).reduce((acc, key) => acc + 1 + countJsonKeys(record[key], depth + 1, maxDepth), 0);
}

export type FetchRuntimeConfigResult =
  | { kind: 'no_config' }
  | { kind: 'ok'; value: Record<string, unknown> }
  | { kind: 'error'; statusCode: number; log: string };

export interface FetchRuntimeConfigEnv {
  CONFIG?: string;
  CONFIG_ALLOWED_HOSTS?: string;
  CONFIG_ALLOW_INSECURE_HTTP?: string;
  CONFIG_FETCH_TIMEOUT_MS?: string;
  CONFIG_FETCH_MAX_BYTES?: string;
  CONFIG_JSON_MAX_DEPTH?: string;
  CONFIG_JSON_MAX_KEYS?: string;
  /** Skip DNS resolution check (not recommended in production). */
  CONFIG_SKIP_DNS_CHECK?: string;
  NODE_ENV?: string;
}

/**
 * Fetches and validates remote runtime JSON for `GET /config` on frontend Express servers.
 *
 * Production (NODE_ENV=production): HTTPS only unless CONFIG_ALLOW_INSECURE_HTTP=true;
 * CONFIG_ALLOWED_HOSTS is required when CONFIG is set; hostname must match allowlist.
 *
 * Non-production: if CONFIG_ALLOWED_HOSTS is set, hostname must match; otherwise only
 * localhost / 127.0.0.1 / ::1 are allowed (for local desktop/dev).
 *
 * Defense-in-depth (DNS rebinding): for non-literal hostnames, resolves the hostname and
 * rejects if any address is private or loopback, unless CONFIG_SKIP_DNS_CHECK=true,
 * NODE_ENV=test, or the host is a dev self-host (localhost / 127.0.0.1 / ::1).
 */
export async function assertConfigHostnameResolvesToPublicIps(
  hostname: string,
  env: FetchRuntimeConfigEnv,
): Promise<FetchRuntimeConfigResult | null> {
  if (env.CONFIG_SKIP_DNS_CHECK?.trim().toLowerCase() === 'true') {
    return null;
  }

  if (env.NODE_ENV === 'test') {
    return null;
  }

  const host = hostname.trim().toLowerCase();

  if (net.isIP(host)) {
    return null;
  }

  if (isDevSelfHost(host)) {
    return null;
  }

  try {
    const results = await dnsPromises.lookup(host, { all: true, verbatim: true });

    for (const entry of results) {
      if (isPrivateOrLoopbackIp(entry.address)) {
        return {
          kind: 'error',
          statusCode: 500,
          log: 'CONFIG hostname resolves to a private or loopback address',
        };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { kind: 'error', statusCode: 500, log: `CONFIG hostname could not be resolved: ${message}` };
  }

  return null;
}

export async function fetchRuntimeConfigFromEnv(env: FetchRuntimeConfigEnv): Promise<FetchRuntimeConfigResult> {
  const configUrlRaw = env.CONFIG?.trim();

  if (!configUrlRaw) {
    return { kind: 'no_config' };
  }

  const isProduction = env.NODE_ENV === 'production';
  let url: URL;

  try {
    url = new URL(configUrlRaw);
  } catch {
    return { kind: 'error', statusCode: 500, log: 'CONFIG is not a valid URL' };
  }

  if (url.username || url.password) {
    return { kind: 'error', statusCode: 500, log: 'CONFIG URL must not contain credentials' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { kind: 'error', statusCode: 500, log: 'CONFIG URL must use http(s)' };
  }

  const allowInsecure = env.CONFIG_ALLOW_INSECURE_HTTP?.trim().toLowerCase() === 'true';

  if (isProduction && url.protocol === 'http:' && !allowInsecure) {
    return {
      kind: 'error',
      statusCode: 500,
      log: 'CONFIG URL must use https in production (or set CONFIG_ALLOW_INSECURE_HTTP=true)',
    };
  }

  const host = url.hostname.trim().toLowerCase();

  if (!host) {
    return { kind: 'error', statusCode: 500, log: 'CONFIG URL hostname is required' };
  }

  const allowedFromEnv = parseAllowedHosts(env.CONFIG_ALLOWED_HOSTS);

  if (isProduction) {
    if (allowedFromEnv.length === 0) {
      return {
        kind: 'error',
        statusCode: 500,
        log: 'CONFIG is set but CONFIG_ALLOWED_HOSTS is empty in production',
      };
    }

    if (!allowedFromEnv.includes(host)) {
      return { kind: 'error', statusCode: 500, log: `CONFIG hostname "${host}" is not in CONFIG_ALLOWED_HOSTS` };
    }
  } else if (allowedFromEnv.length > 0) {
    if (!allowedFromEnv.includes(host)) {
      return { kind: 'error', statusCode: 500, log: `CONFIG hostname "${host}" is not in CONFIG_ALLOWED_HOSTS` };
    }
  } else if (!isDevSelfHost(host)) {
    return {
      kind: 'error',
      statusCode: 500,
      log: 'CONFIG hostname must be listed in CONFIG_ALLOWED_HOSTS, or use localhost/127.0.0.1/::1 in non-production',
    };
  }

  if (net.isIP(host) && isPrivateOrLoopbackIp(host) && !isDevSelfHost(host) && allowedFromEnv.length === 0) {
    return { kind: 'error', statusCode: 500, log: 'CONFIG must not target this private/loopback address' };
  }

  if (!net.isIP(host) && isPrivateOrLoopbackHost(host)) {
    return { kind: 'error', statusCode: 500, log: 'CONFIG hostname is not allowed' };
  }

  const dnsResult = await assertConfigHostnameResolvesToPublicIps(host, env);

  if (dnsResult) {
    return dnsResult;
  }

  const timeoutMs = Math.min(Math.max(parseInt(env.CONFIG_FETCH_TIMEOUT_MS || '10000', 10) || 10000, 1000), 120_000);
  const maxBytes = Math.min(
    Math.max(parseInt(env.CONFIG_FETCH_MAX_BYTES || String(256 * 1024), 10) || 262144, 1024),
    2 * 1024 * 1024,
  );
  const maxDepth = Math.min(Math.max(parseInt(env.CONFIG_JSON_MAX_DEPTH || '12', 10) || 12, 1), 32);
  const maxKeys = Math.min(Math.max(parseInt(env.CONFIG_JSON_MAX_KEYS || '512', 10) || 512, 1), 10_000);
  let response: Response;

  try {
    response = await fetch(configUrlRaw, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { kind: 'error', statusCode: 500, log: `CONFIG fetch failed: ${message}` };
  }

  if (!response.ok) {
    return {
      kind: 'error',
      statusCode: 500,
      log: `CONFIG fetch returned ${response.status} ${response.statusText}`,
    };
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return { kind: 'error', statusCode: 500, log: `CONFIG response must be application/json, got: ${contentType}` };
  }

  const text = await response.text();

  if (text.length > maxBytes) {
    return {
      kind: 'error',
      statusCode: 500,
      log: `CONFIG response exceeds CONFIG_FETCH_MAX_BYTES (${maxBytes})`,
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { kind: 'error', statusCode: 500, log: 'CONFIG response is not valid JSON' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'error', statusCode: 500, log: 'CONFIG JSON must be a plain object' };
  }

  const keyCount = countJsonKeys(parsed, 0, maxDepth);

  if (keyCount > maxKeys) {
    return {
      kind: 'error',
      statusCode: 500,
      log: `CONFIG JSON exceeds CONFIG_JSON_MAX_KEYS (${maxKeys}) at depth ${maxDepth}`,
    };
  }

  return { kind: 'ok', value: parsed as Record<string, unknown> };
}
