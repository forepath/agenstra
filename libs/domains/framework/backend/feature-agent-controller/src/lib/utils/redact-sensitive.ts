const SENSITIVE_KEY_PATTERN =
  /(authorization|token|secret|password|passwd|api[_-]?key|apikey|private[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|credential|credentials|bearer|cookie|set-cookie|ssh|b64)/i;

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return '[REDACTED]';
  }

  return '[REDACTED]';
}

/**
 * Detects compact JWT-shaped strings (three Base64URL segments) for logging redaction.
 */
function looksLikeJwt(value: string): boolean {
  const t = value.trim();

  if (!t || t.length < 20) {
    return false;
  }

  const parts = t.split('.');

  if (parts.length !== 3) {
    return false;
  }

  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

function redactStringIfOpaqueSecretLike(value: string): string {
  const t = value.trim();

  if (t.startsWith('Bearer ') && t.length > 12) {
    return '[REDACTED]';
  }

  if (t.startsWith('Basic ') && t.length > 8) {
    return '[REDACTED]';
  }

  if (looksLikeJwt(t)) {
    return '[REDACTED]';
  }

  return value;
}

export function redactSensitive(input: unknown, depth = 0): unknown {
  if (depth > 6) {
    return '[REDACTED]';
  }

  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return redactStringIfOpaqueSecretLike(input);
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((entry) => redactSensitive(entry, depth + 1));
  }

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = redactValue(value);
        continue;
      }

      if (typeof value === 'string') {
        out[key] = redactStringIfOpaqueSecretLike(value);
        continue;
      }

      out[key] = redactSensitive(value, depth + 1);
    }

    return out;
  }

  return input;
}
