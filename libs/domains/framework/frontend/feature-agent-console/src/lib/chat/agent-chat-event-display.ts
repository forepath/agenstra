import type {
  AgentEventEnvelope,
  AgentEventKind,
  SuccessResponse,
} from '@forepath/framework/frontend/data-access-agent-console';

/** One row in the structured agent-event list (decoded from websocket `chatEvent`). */
export interface AgentChatEventDisplayRow {
  /** Stable unique id for Angular `@for` track */
  trackId: string;
  kind: AgentEventKind;
  /** Short label for the badge */
  kindLabel: string;
  /** Primary summary line */
  summaryTitle: string;
  /** Secondary line (preview, ids, status) */
  summaryBody: string;
  /** Bootstrap contextual badge class (without `text-*` unless needed) */
  badgeClass: string;
  /** Pretty-printed JSON for the full envelope (expandable details) */
  detailJson: string;
  /** Time derived from envelope `timestamp` (fallback: socket receive time) */
  displayTimestampMs: number;
}

const KIND_LABELS: Record<AgentEventKind, string> = {
  userMessage: 'User',
  thinking: 'Thinking',
  assistantDelta: 'Delta',
  assistantMessage: 'Assistant',
  toolCall: 'Tool',
  toolResult: 'Result',
  question: 'Question',
  status: 'Status',
  error: 'Error',
};

function previewString(value: string, maxChars: number): string {
  const t = value.replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, maxChars - 1)}…`;
}

function previewUnknown(value: unknown, maxChars: number): string {
  if (value === undefined || value === null) {
    return '—';
  }
  if (typeof value === 'string') {
    return previewString(value, maxChars);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return previewString(JSON.stringify(value), maxChars);
  } catch {
    return '[Unserializable]';
  }
}

function parseEnvelopeTimestamp(iso: string, fallbackMs: number): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function isChatEventSuccess(payload: unknown): payload is SuccessResponse<AgentEventEnvelope> {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const p = payload as Record<string, unknown>;
  if (p['success'] !== true) {
    return false;
  }
  const data = p['data'];
  if (!data || typeof data !== 'object') {
    return false;
  }
  const d = data as Record<string, unknown>;
  return typeof d['eventId'] === 'string' && typeof d['kind'] === 'string';
}

/** Parsed `chatEvent` success envelope, or null if the payload is not a valid structured event. */
export function tryParseChatEventEnvelope(payload: unknown): AgentEventEnvelope | null {
  if (!isChatEventSuccess(payload)) {
    return null;
  }
  return payload.data;
}

function formatDetail(envelope: AgentEventEnvelope): string {
  try {
    return JSON.stringify(envelope, null, 2);
  } catch {
    return String(envelope);
  }
}

function summarizeEnvelope(
  envelope: AgentEventEnvelope,
): Omit<AgentChatEventDisplayRow, 'detailJson' | 'trackId' | 'displayTimestampMs'> {
  const kind = envelope.kind;
  const payload = envelope.payload;
  const kindLabel = KIND_LABELS[kind] ?? kind;
  let summaryTitle = kindLabel;
  let summaryBody = '';
  let badgeClass = 'bg-secondary';

  switch (kind) {
    case 'userMessage': {
      const text = typeof (payload as { text?: unknown }).text === 'string' ? (payload as { text: string }).text : '';
      summaryTitle = 'User message';
      summaryBody = previewString(text, 200);
      badgeClass = 'bg-secondary';
      break;
    }
    case 'thinking': {
      const phase =
        typeof (payload as { phase?: unknown }).phase === 'string' ? (payload as { phase: string }).phase.trim() : '';
      summaryTitle = 'Agent is thinking';
      summaryBody = phase ? previewString(phase, 120) : 'Waiting for the first response…';
      badgeClass = 'bg-light text-dark border';
      break;
    }
    case 'assistantDelta': {
      const delta =
        typeof (payload as { delta?: unknown }).delta === 'string' ? (payload as { delta: string }).delta : '';
      summaryTitle = 'Assistant (streaming)';
      summaryBody = previewString(delta, 220);
      badgeClass = 'bg-info';
      break;
    }
    case 'assistantMessage': {
      const text = typeof (payload as { text?: unknown }).text === 'string' ? (payload as { text: string }).text : '';
      summaryTitle = 'Assistant message';
      summaryBody = previewString(text, 220);
      badgeClass = 'bg-primary';
      break;
    }
    case 'toolCall': {
      const p = payload as {
        toolCallId?: unknown;
        name?: unknown;
        args?: unknown;
        status?: unknown;
      };
      const name = typeof p.name === 'string' ? p.name : 'tool';
      const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : '—';
      const status = typeof p.status === 'string' ? p.status : 'unknown';
      summaryTitle = `Tool call · ${name}`;
      summaryBody = `${status} · ${toolCallId}`;
      if (p.args !== undefined) {
        summaryBody += ` · ${previewUnknown(p.args, 160)}`;
      }
      badgeClass = 'bg-warning text-dark';
      break;
    }
    case 'toolResult': {
      const p = payload as {
        toolCallId?: unknown;
        name?: unknown;
        result?: unknown;
        isError?: unknown;
      };
      const name = typeof p.name === 'string' ? p.name : 'tool';
      const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : '—';
      const isError = Boolean(p.isError);
      summaryTitle = `Tool result · ${name}`;
      summaryBody = `${isError ? 'Failed' : 'Success'} · ${toolCallId} · ${previewUnknown(p.result, 200)}`;
      badgeClass = isError ? 'bg-danger' : 'bg-success';
      break;
    }
    case 'question': {
      const p = payload as { prompt?: unknown; questionId?: unknown; options?: unknown };
      const prompt = typeof p.prompt === 'string' ? p.prompt : '';
      const qid = typeof p.questionId === 'string' ? p.questionId : '';
      summaryTitle = 'Question';
      summaryBody = [qid ? `#${qid}` : '', previewString(prompt, 200)].filter(Boolean).join(' · ');
      badgeClass = 'bg-primary';
      break;
    }
    case 'status': {
      const msg =
        typeof (payload as { message?: unknown }).message === 'string' ? (payload as { message: string }).message : '';
      summaryTitle = 'Status';
      summaryBody = previewString(msg, 220);
      badgeClass = 'bg-secondary';
      break;
    }
    case 'error': {
      const p = payload as { message?: unknown; code?: unknown; details?: unknown };
      const message = typeof p.message === 'string' ? p.message : 'Error';
      const code = typeof p.code === 'string' ? p.code : '';
      summaryTitle = code ? `Error (${code})` : 'Error';
      summaryBody = previewString(message, 200);
      if (typeof p.details === 'string' && p.details.trim()) {
        summaryBody += ` · ${previewString(p.details, 120)}`;
      }
      badgeClass = 'bg-danger';
      break;
    }
    default: {
      summaryBody = previewUnknown(payload, 200);
      badgeClass = 'bg-secondary';
    }
  }

  return {
    kind,
    kindLabel,
    summaryTitle,
    summaryBody,
    badgeClass,
  };
}

const isThinkingSummaryPlaceholder = (s: string): boolean => {
  const t = s.trim();
  return t.length === 0 || t === '…' || t === '—';
};

/**
 * Merges two consecutive `thinking` display rows (chunked producer output).
 */
export function mergeAdjacentThinkingDisplayRows(
  prev: AgentChatEventDisplayRow,
  row: AgentChatEventDisplayRow,
): AgentChatEventDisplayRow {
  const pieces = [prev.summaryBody, row.summaryBody]
    .map((s) => s.trim())
    .filter((s) => !isThinkingSummaryPlaceholder(s));
  const mergedRaw = pieces.join('\n');
  const summaryBody = mergedRaw.length === 0 ? '…' : previewString(mergedRaw.replace(/\r\n/g, '\n'), 480);
  return {
    ...prev,
    trackId: `${prev.trackId}~${row.trackId}`,
    summaryBody,
    detailJson: `${prev.detailJson}\n---\n${row.detailJson}`.trim(),
  };
}

/**
 * Merges adjacent `thinking` rows so chunked producer output shows as one timeline pill (summary + combined details).
 */
export function consolidateConsecutiveThinkingTimelineRows(
  rows: AgentChatEventDisplayRow[],
): AgentChatEventDisplayRow[] {
  if (rows.length === 0) {
    return rows;
  }
  const out: AgentChatEventDisplayRow[] = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    if (row.kind === 'thinking' && prev?.kind === 'thinking') {
      out[out.length - 1] = mergeAdjacentThinkingDisplayRows(prev, row);
    } else {
      out.push(row);
    }
  }
  return out;
}

/**
 * Maps a single forwarded socket row (from `chatEvent`) into a display row, or `null` if the payload is not a success envelope.
 */
export function mapForwardedChatEventToDisplayRow(forwarded: {
  payload: unknown;
  timestamp: number;
}): AgentChatEventDisplayRow | null {
  const envelope = tryParseChatEventEnvelope(forwarded.payload);
  if (!envelope) {
    return null;
  }
  const displayTimestampMs = parseEnvelopeTimestamp(envelope.timestamp, forwarded.timestamp);
  return {
    trackId: `${envelope.eventId}-${forwarded.timestamp}`,
    displayTimestampMs,
    detailJson: formatDetail(envelope),
    ...summarizeEnvelope(envelope),
  };
}

/**
 * Maps the last forwarded `chatEvent` entries to UI rows (newest kept by caller via slice).
 */
export function mapForwardedChatEventsToDisplayRows(
  events: Array<{ payload: unknown; timestamp: number }>,
): AgentChatEventDisplayRow[] {
  const rows = events
    .map((ev) => mapForwardedChatEventToDisplayRow(ev))
    .filter((row): row is AgentChatEventDisplayRow => row !== null);
  return consolidateConsecutiveThinkingTimelineRows(rows);
}
