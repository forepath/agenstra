/**
 * Unwraps agent-manager Socket.IO payloads shaped as `{ success, data }` or raw.
 */
export function unwrapSuccessData<T = Record<string, unknown>>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.success === true && o.data && typeof o.data === 'object') {
    return o.data as T;
  }
  return raw as T;
}

export function parseChatEventEnvelope(raw: unknown): {
  correlationId?: string;
  kind?: string;
  payload?: Record<string, unknown>;
} | null {
  const data = unwrapSuccessData<Record<string, unknown>>(raw);
  if (!data) {
    return null;
  }
  const correlationId = typeof data.correlationId === 'string' ? data.correlationId : undefined;
  const kind = typeof data.kind === 'string' ? data.kind : undefined;
  const payload =
    data.payload && typeof data.payload === 'object' ? (data.payload as Record<string, unknown>) : undefined;
  return { correlationId, kind, payload };
}

export function parseAgentChatMessage(raw: unknown): {
  from?: string;
  response?: unknown;
  text?: string;
} | null {
  const data = unwrapSuccessData<Record<string, unknown>>(raw);
  if (!data) {
    return null;
  }
  const from = typeof data.from === 'string' ? data.from : undefined;
  const text = typeof data.text === 'string' ? data.text : undefined;
  const response = data.response;
  return { from, response, text };
}

export function agentResponseToPlainText(response: unknown): string {
  if (response === null || response === undefined) {
    return '';
  }
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response === 'object') {
    const o = response as Record<string, unknown>;
    if (typeof o.result === 'string') {
      return o.result;
    }
    if (typeof o.text === 'string') {
      return o.text;
    }
    try {
      return JSON.stringify(response);
    } catch {
      return String(response);
    }
  }
  return String(response);
}
