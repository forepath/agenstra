import type { AgentEventEnvelope, SuccessResponse } from '@forepath/framework/frontend/data-access-agent-console';

import {
  consolidateConsecutiveThinkingTimelineRows,
  mapForwardedChatEventToDisplayRow,
  mapForwardedChatEventsToDisplayRows,
} from './agent-chat-event-display';

function successEnvelope(data: AgentEventEnvelope): SuccessResponse<AgentEventEnvelope> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

describe('agent-chat-event-display', () => {
  it('maps toolCall with object args to readable summary', () => {
    const row = mapForwardedChatEventToDisplayRow({
      payload: successEnvelope({
        eventId: 'ev-1',
        agentId: 'a1',
        correlationId: 'c1',
        sequence: 1,
        timestamp: '2026-04-08T12:00:00.000Z',
        kind: 'toolCall',
        payload: {
          toolCallId: 't1',
          name: 'read',
          status: 'started',
          args: { path: '/app/README.md', offset: 0 },
        },
      }),
      timestamp: 1000,
    });

    expect(row).not.toBeNull();
    expect(row!.summaryTitle).toContain('read');
    expect(row!.summaryBody).toContain('started');
    expect(row!.summaryBody).toContain('t1');
    expect(row!.summaryBody).toContain('README');
    expect(row!.detailJson).toContain('"kind": "toolCall"');
    expect(row!.detailJson).toContain('"path": "/app/README.md"');
  });

  it('maps toolResult with object result to readable summary (not [object Object])', () => {
    const row = mapForwardedChatEventToDisplayRow({
      payload: successEnvelope({
        eventId: 'ev-2',
        agentId: 'a1',
        correlationId: 'c1',
        sequence: 2,
        timestamp: '2026-04-08T12:00:01.000Z',
        kind: 'toolResult',
        payload: {
          toolCallId: 't1',
          name: 'bash',
          isError: false,
          result: { output: 'hello\n', exit: 0, metadata: { foo: 'bar' } },
        },
      }),
      timestamp: 1001,
    });

    expect(row).not.toBeNull();
    expect(row!.summaryBody).toContain('Success');
    expect(row!.summaryBody).toContain('hello');
    expect(row!.summaryBody).not.toBe('[object Object]');
    expect(row!.badgeClass).toBe('bg-success');
  });

  it('returns null for non-success payloads', () => {
    expect(
      mapForwardedChatEventToDisplayRow({
        payload: { success: false, error: { message: 'x' }, timestamp: '' },
        timestamp: 1,
      }),
    ).toBeNull();
  });

  it('consolidateConsecutiveThinkingTimelineRows merges adjacent thinking rows', () => {
    const merged = consolidateConsecutiveThinkingTimelineRows([
      {
        trackId: 'a',
        kind: 'thinking',
        kindLabel: 'Thinking',
        summaryTitle: 'Thinking',
        summaryBody: 'First chunk',
        badgeClass: 'bg-light',
        detailJson: '{"a":1}',
        displayTimestampMs: 1,
      },
      {
        trackId: 'b',
        kind: 'thinking',
        kindLabel: 'Thinking',
        summaryTitle: 'Thinking',
        summaryBody: ' second chunk',
        badgeClass: 'bg-light',
        detailJson: '{"b":2}',
        displayTimestampMs: 2,
      },
      {
        trackId: 'c',
        kind: 'toolCall',
        kindLabel: 'Tool',
        summaryTitle: 'Tool · read',
        summaryBody: 'started',
        badgeClass: 'bg-warning',
        detailJson: '{}',
        displayTimestampMs: 3,
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]?.kind).toBe('thinking');
    expect(merged[0]?.summaryBody).toContain('First chunk');
    expect(merged[0]?.summaryBody).toContain('second chunk');
    expect(merged[0]?.detailJson).toContain('---');
    expect(merged[1]?.kind).toBe('toolCall');
  });

  it('mapForwardedChatEventsToDisplayRows preserves order and filters invalid', () => {
    const rows = mapForwardedChatEventsToDisplayRows([
      {
        payload: successEnvelope({
          eventId: 'e1',
          agentId: 'a',
          correlationId: 'c',
          sequence: 0,
          timestamp: '2026-04-08T12:00:00.000Z',
          kind: 'status',
          payload: { message: 'Working…' },
        }),
        timestamp: 10,
      },
      {
        payload: { success: false, error: { message: 'bad' }, timestamp: '' },
        timestamp: 11,
      },
    ]);

    expect(rows.length).toBe(1);
    expect(rows[0].kind).toBe('status');
  });
});
