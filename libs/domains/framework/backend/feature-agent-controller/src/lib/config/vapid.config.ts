/**
 * Web Push VAPID configuration from environment variables.
 * Generate keys: `npx web-push generate-vapid-keys`
 */
export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function readVapidConfigFromEnv(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@localhost';

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function isVapidConfigured(): boolean {
  return readVapidConfigFromEnv() !== null;
}
