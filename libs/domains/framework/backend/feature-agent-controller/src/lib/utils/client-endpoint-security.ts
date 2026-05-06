import { promises as dnsPromises } from 'node:dns';
import * as net from 'node:net';

import { BadRequestException, Logger } from '@nestjs/common';

function isPrivateIpv4(ip: string): boolean {
  if (!net.isIPv4(ip)) {
    return false;
  }

  if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('169.254.') || ip.startsWith('192.168.')) {
    return true;
  }

  // 172.16.0.0/12
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const secondOctet = Number(parts[1]);

    return Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  if (!net.isIPv6(ip)) {
    return false;
  }

  const normalized = ip.toLowerCase();

  // loopback
  if (normalized === '::1') {
    return true;
  }

  // unique local addresses fc00::/7
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // link-local fe80::/10
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  return false;
}

function getAllowedClientEndpointHosts(): string[] {
  const raw = process.env.CLIENT_ENDPOINT_ALLOWED_HOSTS;

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

export interface ClientEndpointTlsPolicy {
  rejectUnauthorized: boolean;
}

export function getClientEndpointTlsPolicy(logger?: Logger): ClientEndpointTlsPolicy {
  const raw = process.env.CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED;
  const explicitDisable = raw?.trim().toLowerCase() === 'false';

  if (!explicitDisable) {
    return { rejectUnauthorized: true };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED=false is not allowed in production');
  }

  logger?.warn('CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED=false: TLS verification is disabled (development only).');

  return { rejectUnauthorized: false };
}

/**
 * SSRF guardrails for client-controlled endpoints.
 *
 * Notes:
 * - This validates the URL shape and blocks obvious local/private targets.
 * - If `CLIENT_ENDPOINT_ALLOWED_HOSTS` is set, it becomes a strict allowlist.
 * - This does not perform DNS resolution; prefer allowlisting in production.
 */
export function assertSafeClientEndpointOrThrow(endpoint: string): URL {
  const trimmed = endpoint.trim();
  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new BadRequestException('Client endpoint must be a valid URL');
  }

  if (url.username || url.password) {
    throw new BadRequestException('Client endpoint must not contain username/password');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestException('Client endpoint must use http(s)');
  }

  const allowInsecureHttp = process.env.CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP?.trim().toLowerCase() === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  if (url.protocol === 'http:' && isProduction && !allowInsecureHttp) {
    throw new BadRequestException(
      'Client endpoint must use https (set CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP=true to allow http)',
    );
  }

  const host = url.hostname.trim().toLowerCase();

  if (!host) {
    throw new BadRequestException('Client endpoint hostname is required');
  }

  if (isProduction && (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local'))) {
    throw new BadRequestException('Client endpoint hostname is not allowed');
  }

  if (net.isIP(host)) {
    if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
      throw new BadRequestException('Client endpoint must not target private or loopback IP ranges');
    }
  }

  const allowedHosts = getAllowedClientEndpointHosts();

  if (allowedHosts.length > 0 && !allowedHosts.includes(host)) {
    throw new BadRequestException('Client endpoint host is not in allowlist');
  }

  return url;
}

/**
 * Resolves hostname to addresses and rejects private/loopback ranges (defense-in-depth vs DNS rebinding).
 * Skipped for literal IPs (already validated) and when CLIENT_ENDPOINT_SKIP_DNS_CHECK=true.
 */
export async function assertClientEndpointHostnameResolvesToPublicIps(hostname: string): Promise<void> {
  if (process.env.CLIENT_ENDPOINT_SKIP_DNS_CHECK?.trim().toLowerCase() === 'true') {
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (net.isIP(hostname)) {
    return;
  }

  try {
    const results = await dnsPromises.lookup(hostname, { all: true, verbatim: true });

    for (const entry of results) {
      if (isPrivateIpv4(entry.address) || isPrivateIpv6(entry.address)) {
        throw new BadRequestException('Client endpoint hostname resolves to a private or loopback address');
      }
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    throw new BadRequestException(`Client endpoint hostname could not be resolved: ${message}`);
  }
}

/**
 * Validates client endpoint URL synchronously, then ensures DNS does not point to private/loopback space.
 */
export async function validateClientEndpointWithDnsOrThrow(endpoint: string): Promise<URL> {
  const url = assertSafeClientEndpointOrThrow(endpoint);

  await assertClientEndpointHostnameResolvesToPublicIps(url.hostname);

  return url;
}

/**
 * Exit the process in production if client endpoint allowlist is not configured (SSRF hard requirement).
 */
export function assertProductionClientEndpointAllowlistConfigured(logger?: ProductionAllowlistLogger): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const raw = process.env.CLIENT_ENDPOINT_ALLOWED_HOSTS?.trim();

  if (!raw) {
    const msg = 'FATAL: CLIENT_ENDPOINT_ALLOWED_HOSTS must be set in production for agent-controller. Exiting.';

    logger?.error(msg);
    process.stderr.write(`${msg}\n`);
    process.exit(1);
  }
}

export interface ProductionAllowlistLogger {
  error(message: string): void;
}
