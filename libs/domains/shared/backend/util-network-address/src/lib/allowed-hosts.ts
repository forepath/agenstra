/**
 * Parses a comma-separated list of hostnames (or `*`) into lowercase trimmed entries.
 * Used by CONFIG URL allowlists and client endpoint SSRF allowlists.
 */
export function parseAllowedHosts(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}
