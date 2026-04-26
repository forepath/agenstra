import type {
  AgentResponseObject,
  ChatMessageData,
  ForwardedEventPayload,
  TicketAutomationRunChatEventPayload,
} from '@forepath/framework/frontend/data-access-agent-console';

/** Matches `selectChatTimelineOrdered` rows (avoid importing selector here for Jest graph). */
export interface ChatTimelineOrderedRowLike {
  event: string;
  payload: unknown;
  timestamp: number;
  semanticTimestamp: number;
}

const TICKET_AUTOMATION_RUN_CHAT_UPSERT = 'ticketAutomationRunChatUpsert';

import { mergeAdjacentThinkingDisplayRows, type AgentChatEventDisplayRow } from './agent-chat-event-display';
import { extractThinkingPreviewText, formatAgentResponseForChatMarkdown } from './agent-chat-response-markdown';

/** Mirrors chat.component `ChatMessageWithFilter` without importing the component. */
export type ChatMessageWithFilter = {
  event: string;
  payload: ForwardedEventPayload;
  timestamp: number;
  filterResult: {
    direction: 'incoming' | 'outgoing';
    status: 'allowed' | 'filtered' | 'dropped';
    matchedFilter?: {
      type: string;
      displayName: string;
      matched: boolean;
      reason?: string;
    };
  } | null;
};

export type ChatDisplayThreadItem =
  | { kind: 'user'; msg: ChatMessageWithFilter }
  | { kind: 'agentTurn'; msgs: ChatMessageWithFilter[]; view: AgentTurnView }
  | { kind: 'ticketAutomationRun'; sortTime: number; payload: TicketAutomationRunChatEventPayload };

/** Ordered slices of an agent turn: structured rows and prose markdown interleaved as produced. */
export type AgentTurnSegment =
  | { kind: 'row'; row: AgentChatEventDisplayRow }
  | { kind: 'markdown'; markdown: string; trackId: string };

export interface AgentTurnView {
  segments: AgentTurnSegment[];
  displayTimestamp: number;
  hasFiltered: boolean;
  hasDropped: boolean;
}

/** Exported for streaming preview: merge adjacent thinking row segments without crossing markdown blocks. */
export function consolidateThinkingInSegments(segments: AgentTurnSegment[]): AgentTurnSegment[] {
  const out: AgentTurnSegment[] = [];

  for (const seg of segments) {
    if (seg.kind !== 'row') {
      out.push(seg);
      continue;
    }

    const prev = out[out.length - 1];

    if (seg.row.kind === 'thinking' && prev?.kind === 'row' && prev.row.kind === 'thinking') {
      out[out.length - 1] = {
        kind: 'row',
        row: mergeAdjacentThinkingDisplayRows(prev.row, seg.row),
      };
    } else {
      out.push(seg);
    }
  }

  return out;
}

function appendMarkdownToSegments(segments: AgentTurnSegment[], md: string, trackId: string): void {
  const trimmed = md.trim();

  if (!trimmed) {
    return;
  }

  const last = segments[segments.length - 1];

  if (last?.kind === 'markdown') {
    last.markdown = `${last.markdown}\n\n${trimmed}`;
  } else {
    segments.push({ kind: 'markdown', markdown: trimmed, trackId });
  }
}

function isUserPayload(payload: ForwardedEventPayload): boolean {
  if ('success' in payload && payload.success && 'data' in payload) {
    const data = payload.data as ChatMessageData;

    return 'from' in data && data.from === 'user';
  }

  return false;
}

function isAgentPayload(payload: ForwardedEventPayload): boolean {
  if ('success' in payload && payload.success && 'data' in payload) {
    const data = payload.data as ChatMessageData;

    return 'from' in data && data.from === 'agent';
  }

  return false;
}

function getChatMessageData(payload: ForwardedEventPayload): ChatMessageData | null {
  if ('success' in payload && payload.success && 'data' in payload) {
    return payload.data as ChatMessageData;
  }

  return null;
}

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

/**
 * Maps a structured agent response object to a streaming-style timeline row, or null when it
 * should be rendered as assistant markdown instead.
 */
export function mapAgentResponseObjectToDisplayRow(
  r: AgentResponseObject,
  trackId: string,
  displayTimestampMs: number,
): AgentChatEventDisplayRow | null {
  const t = r.type;

  if (t === 'tool' || t === 'tool_call' || t === 'toolCall') {
    const name = typeof r['name'] === 'string' ? r['name'] : 'tool';
    const toolCallId = typeof r['toolCallId'] === 'string' ? r['toolCallId'] : '—';
    const status = typeof r['status'] === 'string' ? r['status'] : 'unknown';
    let summaryBody = `${status} · ${toolCallId}`;

    if (r['args'] !== undefined) {
      summaryBody += ` · ${previewUnknown(r['args'], 160)}`;
    }

    return {
      trackId,
      kind: 'toolCall',
      kindLabel: 'Tool',
      summaryTitle: `Tool call · ${name}`,
      summaryBody,
      badgeClass: 'bg-warning text-dark',
      detailJson: JSON.stringify(r, null, 2),
      displayTimestampMs,
    };
  }

  if (t === 'tool_result' || t === 'toolResult') {
    const name = typeof r['name'] === 'string' ? r['name'] : 'tool';
    const toolCallId = typeof r['toolCallId'] === 'string' ? r['toolCallId'] : '—';
    const isError = Boolean(r['isError'] ?? r['is_error']);

    return {
      trackId,
      kind: 'toolResult',
      kindLabel: 'Result',
      summaryTitle: `Tool result · ${name}`,
      summaryBody: `${isError ? 'Failed' : 'Success'} · ${toolCallId} · ${previewUnknown(r['result'], 200)}`,
      badgeClass: isError ? 'bg-danger' : 'bg-success',
      detailJson: JSON.stringify(r, null, 2),
      displayTimestampMs,
    };
  }

  if (t === 'question') {
    const prompt = typeof r['prompt'] === 'string' ? r['prompt'] : '';
    const qid = typeof r['questionId'] === 'string' ? r['questionId'] : '';

    return {
      trackId,
      kind: 'question',
      kindLabel: 'Question',
      summaryTitle: 'Question',
      summaryBody: [qid ? `#${qid}` : '', previewString(prompt, 200)].filter(Boolean).join(' · '),
      badgeClass: 'bg-primary',
      detailJson: JSON.stringify(r, null, 2),
      displayTimestampMs,
    };
  }

  if (t === 'error' || r.is_error === true) {
    const message = typeof r['message'] === 'string' ? r['message'] : 'Error';
    const code = typeof r['code'] === 'string' ? r['code'] : '';

    return {
      trackId,
      kind: 'error',
      kindLabel: 'Error',
      summaryTitle: code ? `Error (${code})` : 'Error',
      summaryBody: previewString(message, 200),
      badgeClass: 'bg-danger',
      detailJson: JSON.stringify(r, null, 2),
      displayTimestampMs,
    };
  }

  if (t === 'thinking') {
    const preview = extractThinkingPreviewText(r);

    return {
      trackId,
      kind: 'thinking',
      kindLabel: 'Thinking',
      summaryTitle: 'Thinking',
      summaryBody: preview ? previewString(preview, 220) : '…',
      badgeClass: 'bg-light text-dark border',
      detailJson: JSON.stringify(r, null, 2),
      displayTimestampMs,
    };
  }

  return null;
}

function isMessageDropped(messageData: ChatMessageData): boolean {
  if (!('response' in messageData)) {
    return false;
  }

  const r = messageData.response;

  if (typeof r !== 'object' || r === null) {
    return false;
  }

  const o = r as AgentResponseObject;

  return (
    o.type === 'error' &&
    (o['result'] === 'MESSAGE_DROPPED' || String(o['message'] ?? '').includes('Message was dropped'))
  );
}

function buildViewFromParts(parts: AgentResponseObject[], baseTimestamp: number): AgentTurnView {
  const segments: AgentTurnSegment[] = [];
  let i = 0;

  for (const part of parts) {
    if (part.type === 'delta') {
      continue;
    }

    const row = mapAgentResponseObjectToDisplayRow(part, `part-${baseTimestamp}-${i}`, baseTimestamp);

    if (row) {
      segments.push({ kind: 'row', row });
    } else {
      const md = formatAgentResponseForChatMarkdown(part);

      appendMarkdownToSegments(segments, md, `md-${baseTimestamp}-${i}`);
    }

    i += 1;
  }

  return {
    segments: consolidateThinkingInSegments(segments),
    displayTimestamp: baseTimestamp,
    hasFiltered: false,
    hasDropped: false,
  };
}

export function buildAgentTurnView(msgs: ChatMessageWithFilter[]): AgentTurnView {
  if (msgs.length === 0) {
    return {
      segments: [],
      displayTimestamp: Date.now(),
      hasFiltered: false,
      hasDropped: false,
    };
  }

  const hasFiltered = msgs.some((m) => m.filterResult?.status === 'filtered');
  const hasDropped = msgs.some((m) => {
    const d = getChatMessageData(m.payload);

    return d ? isMessageDropped(d) : false;
  });

  if (msgs.length === 1) {
    const data = getChatMessageData(msgs[0].payload);

    if (data && 'response' in data) {
      const r = data.response;

      if (typeof r === 'object' && r !== null && r['type'] === 'agenstra_turn' && Array.isArray(r['parts'])) {
        const view = buildViewFromParts(r['parts'] as AgentResponseObject[], msgs[0].timestamp);

        return { ...view, hasFiltered, hasDropped };
      }
    }
  }

  const segments: AgentTurnSegment[] = [];
  let idx = 0;

  for (const msg of msgs) {
    const data = getChatMessageData(msg.payload);

    if (!data || !('response' in data)) {
      continue;
    }

    const r = data.response;

    if (typeof r === 'string') {
      const md = formatAgentResponseForChatMarkdown(r);

      appendMarkdownToSegments(segments, md, `md-${msg.timestamp}-${idx}`);
    } else {
      const row = mapAgentResponseObjectToDisplayRow(r, `m-${msg.timestamp}-${idx}`, msg.timestamp);

      if (row) {
        segments.push({ kind: 'row', row });
      } else {
        const md = formatAgentResponseForChatMarkdown(r);

        appendMarkdownToSegments(segments, md, `md-${msg.timestamp}-${idx}`);
      }
    }

    idx += 1;
  }

  const displayTimestamp = msgs[msgs.length - 1]?.timestamp ?? Date.now();

  return {
    segments: consolidateThinkingInSegments(segments),
    displayTimestamp,
    hasFiltered,
    hasDropped,
  };
}

export function buildChatDisplayThread(messages: ChatMessageWithFilter[]): ChatDisplayThreadItem[] {
  const out: ChatDisplayThreadItem[] = [];
  let agentRun: ChatMessageWithFilter[] = [];
  const flushAgent = (): void => {
    if (agentRun.length === 0) {
      return;
    }

    const view = buildAgentTurnView(agentRun);

    out.push({ kind: 'agentTurn', msgs: [...agentRun], view });
    agentRun = [];
  };

  for (const msg of messages) {
    if (isUserPayload(msg.payload)) {
      flushAgent();
      out.push({ kind: 'user', msg });
    } else if (isAgentPayload(msg.payload)) {
      agentRun.push(msg);
    }
  }

  flushAgent();

  return out;
}

/**
 * Merges ordered chat + automation timeline rows into display items (automation rows break agent turns).
 */
export function buildMergedChatDisplayThread(
  orderedRows: ChatTimelineOrderedRowLike[],
  filteredChatMessages: ChatMessageWithFilter[],
): ChatDisplayThreadItem[] {
  const resolveChatRow = (row: ChatTimelineOrderedRowLike): ChatMessageWithFilter | null => {
    const hit = filteredChatMessages.find((m) => m.payload === row.payload && m.timestamp === row.timestamp);

    if (hit) {
      return hit;
    }

    if (row.event !== 'chatMessage') {
      return null;
    }

    return {
      event: row.event,
      payload: row.payload as ForwardedEventPayload,
      timestamp: row.timestamp,
      filterResult: null,
    };
  };
  const out: ChatDisplayThreadItem[] = [];
  let agentRun: ChatMessageWithFilter[] = [];
  const flushAgent = (): void => {
    if (agentRun.length === 0) {
      return;
    }

    const view = buildAgentTurnView(agentRun);

    out.push({ kind: 'agentTurn', msgs: [...agentRun], view });
    agentRun = [];
  };

  for (const row of orderedRows) {
    if (row.event === TICKET_AUTOMATION_RUN_CHAT_UPSERT) {
      flushAgent();
      const payload = row.payload as TicketAutomationRunChatEventPayload;

      out.push({ kind: 'ticketAutomationRun', sortTime: row.semanticTimestamp, payload });
      continue;
    }

    if (row.event !== 'chatMessage') {
      continue;
    }

    const msg = resolveChatRow(row);

    if (!msg) {
      continue;
    }

    if (isUserPayload(msg.payload)) {
      flushAgent();
      out.push({ kind: 'user', msg });
    } else if (isAgentPayload(msg.payload)) {
      agentRun.push(msg);
    }
  }

  flushAgent();

  return out;
}
