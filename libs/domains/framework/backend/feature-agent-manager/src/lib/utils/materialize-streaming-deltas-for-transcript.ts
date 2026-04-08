import { AgentResponseObject } from '../providers/agent-provider.interface';

/**
 * Streaming builds `streamedUnified` with `type: "delta"` chunks interleaved with tools, thinking, etc.
 * Persisting by stripping deltas and appending one synthetic `result` loses ordering; this converts each
 * contiguous run of deltas into a `result` part in place before non-delta frames.
 */
export function materializeDeltaPartsIntoInterleavedResults(
  streamedUnified: AgentResponseObject[],
): AgentResponseObject[] {
  const out: AgentResponseObject[] = [];
  let buf = '';
  const flush = () => {
    if (buf.length > 0) {
      out.push({ type: 'result', subtype: 'success', result: buf });
      buf = '';
    }
  };
  for (const part of streamedUnified) {
    const typ = String(part.type);
    const deltaChunk = (part as unknown as { delta?: unknown }).delta;
    if (typ === 'delta' && typeof deltaChunk === 'string') {
      buf += deltaChunk;
      continue;
    }
    flush();
    out.push(part);
  }
  flush();
  return out;
}

function extractResultTextBody(part: AgentResponseObject): string {
  const r = part['result'];
  if (typeof r === 'string') {
    return r;
  }
  if (r === undefined || r === null) {
    return '';
  }
  try {
    return JSON.stringify(r);
  } catch {
    return String(r);
  }
}

/** Collapse whitespace so we can compare stream summaries that differ only in newlines. */
function collapseWhitespaceForCompare(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function joinResultBodiesFromParts(parts: AgentResponseObject[]): string {
  let acc = '';
  for (const p of parts) {
    if (String(p.type) === 'result') {
      acc += extractResultTextBody(p);
    }
  }
  return acc;
}

/**
 * Providers often emit a terminal `{ type: "result" }` NDJSON line that repeats the full assistant
 * output already delivered as `delta` chunks. After materializing deltas into interleaved `result`
 * parts, that trailing frame would show the answer twice in the UI — remove it when it matches the
 * prose from earlier `result` parts in this turn.
 */
export function dropRedundantTrailingStreamResultParts(parts: AgentResponseObject[]): AgentResponseObject[] {
  if (parts.length < 2) {
    return parts;
  }
  const last = parts[parts.length - 1];
  if (String(last.type) !== 'result') {
    return parts;
  }
  const terminal = extractResultTextBody(last);
  if (!terminal.trim()) {
    return parts.slice(0, -1);
  }
  const prior = parts.slice(0, -1);
  const priorJoined = joinResultBodiesFromParts(prior);
  if (priorJoined === terminal) {
    return prior;
  }
  if (collapseWhitespaceForCompare(priorJoined) === collapseWhitespaceForCompare(terminal)) {
    return prior;
  }
  return parts;
}
