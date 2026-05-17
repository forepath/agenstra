/** Normalized push subscription fields required by the controller API. */
export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Validates `PushSubscription.toJSON()` output without unsafe casts.
 * Browser types use optional fields and `keys?: Record<string, string>`.
 */
export function parsePushSubscriptionPayload(
  json: PushSubscriptionJSON | null | undefined,
): PushSubscriptionPayload | null {
  const endpoint = json?.endpoint?.trim();

  if (!endpoint) {
    return null;
  }

  const p256dh = json?.keys?.['p256dh'];
  const authSecret = json?.keys?.['auth'];

  if (typeof p256dh !== 'string' || !p256dh.trim()) {
    return null;
  }

  if (typeof authSecret !== 'string' || !authSecret.trim()) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth: authSecret,
  };
}
