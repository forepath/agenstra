import * as net from 'node:net';

function isPrivateOrLoopbackIpv4(ip: string): boolean {
  if (!net.isIPv4(ip)) {
    return false;
  }

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

function isPrivateOrLoopbackIpv6(ip: string): boolean {
  if (!net.isIPv6(ip)) {
    return false;
  }

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

  return false;
}

/**
 * True when `ip` is an IPv4 or IPv6 address in private, link-local, or loopback space.
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is treated as the embedded IPv4 for this check.
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  const trimmed = ip.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice(7);

    if (net.isIPv4(v4)) {
      return isPrivateOrLoopbackIpv4(v4);
    }
  }

  if (net.isIPv4(trimmed)) {
    return isPrivateOrLoopbackIpv4(trimmed);
  }

  if (net.isIPv6(trimmed)) {
    return isPrivateOrLoopbackIpv6(trimmed);
  }

  return false;
}

/**
 * True for `localhost`, `*.localhost`, `*.local`, or when `hostname` is a private/loopback IP literal.
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }

  if (net.isIP(host)) {
    return isPrivateOrLoopbackIp(host);
  }

  return false;
}

const DEV_SELF_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Local dev hostnames/IPs that skip strict DNS rebinding checks when resolving CONFIG URLs. */
export function isDevSelfHost(hostname: string): boolean {
  return DEV_SELF_HOSTS.has(hostname.trim().toLowerCase());
}
