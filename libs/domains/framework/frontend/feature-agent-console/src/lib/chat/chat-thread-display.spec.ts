import { buildAgentTurnView, buildChatDisplayThread, type ChatMessageWithFilter } from './chat-thread-display';

function chatMsg(from: 'user' | 'agent', response: unknown, ts: number): ChatMessageWithFilter {
  const iso = new Date(ts).toISOString();
  return {
    event: 'chatMessage',
    timestamp: ts,
    filterResult: null,
    payload: {
      success: true,
      data:
        from === 'user'
          ? { from: 'user', text: String(response), timestamp: iso }
          : { from: 'agent', response, timestamp: iso },
      timestamp: iso,
    } as ChatMessageWithFilter['payload'],
  };
}

describe('buildChatDisplayThread', () => {
  it('groups consecutive agent messages into one agent turn', () => {
    const items = buildChatDisplayThread([
      chatMsg('user', 'hi', 1),
      chatMsg('agent', { type: 'tool_call', toolCallId: 'a', name: 'read', status: 'x' }, 2),
      chatMsg('agent', { type: 'result', result: 'ok' }, 3),
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]?.kind).toBe('user');
    expect(items[1]?.kind).toBe('agentTurn');
    if (items[1]?.kind === 'agentTurn') {
      expect(items[1].msgs).toHaveLength(2);
      const rowCount = items[1].view.segments.filter((s) => s.kind === 'row').length;
      expect(rowCount).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildAgentTurnView', () => {
  it('expands agenstra_turn composite from a single message', () => {
    const view = buildAgentTurnView([
      chatMsg(
        'agent',
        {
          type: 'agenstra_turn',
          subtype: 'success',
          parts: [{ type: 'tool_result', toolCallId: 't', name: 'bash', result: 'out', isError: false }],
        },
        10,
      ),
    ]);
    expect(view.segments.some((s) => s.kind === 'row' && s.row.kind === 'toolResult')).toBe(true);
  });

  it('maps thinking parts in agenstra_turn to structured timeline rows like Delta/Tool', () => {
    const view = buildAgentTurnView([
      chatMsg(
        'agent',
        {
          type: 'agenstra_turn',
          subtype: 'success',
          parts: [
            { type: 'thinking', text: 'Reasoning about files' },
            { type: 'result', subtype: 'success', result: 'Done.' },
          ],
        },
        10,
      ),
    ]);
    expect(view.segments.some((s) => s.kind === 'row' && s.row.kind === 'thinking')).toBe(true);
    const md = view.segments.find((s) => s.kind === 'markdown');
    expect(md?.kind).toBe('markdown');
    if (md?.kind === 'markdown') {
      expect(md.markdown).toBe('Done.');
    }
  });

  it('consolidates consecutive thinking parts in agenstra_turn into one row', () => {
    const view = buildAgentTurnView([
      chatMsg(
        'agent',
        {
          type: 'agenstra_turn',
          subtype: 'success',
          parts: [
            { type: 'thinking', text: 'Chunk one' },
            { type: 'thinking', text: 'Chunk two' },
            { type: 'result', subtype: 'success', result: 'OK' },
          ],
        },
        10,
      ),
    ]);
    const thinkingRows = view.segments.filter((s) => s.kind === 'row' && s.row.kind === 'thinking');
    expect(thinkingRows).toHaveLength(1);
    const first = thinkingRows[0];
    expect(first?.kind).toBe('row');
    if (first?.kind === 'row') {
      expect(first.row.summaryBody).toContain('Chunk one');
      expect(first.row.summaryBody).toContain('Chunk two');
    }
  });

  it('preserves interleaved structured rows and prose in agenstra_turn part order', () => {
    const view = buildAgentTurnView([
      chatMsg(
        'agent',
        {
          type: 'agenstra_turn',
          subtype: 'success',
          parts: [
            { type: 'tool_call', toolCallId: 't1', name: 'read', status: 'pending' },
            { type: 'result', subtype: 'success', result: 'Middle reply' },
            { type: 'tool_result', toolCallId: 't2', name: 'bash', result: 'exit 0', isError: false },
          ],
        },
        10,
      ),
    ]);
    expect(view.segments.map((s) => s.kind)).toEqual(['row', 'markdown', 'row']);
    const mid = view.segments[1];
    expect(mid?.kind).toBe('markdown');
    if (mid?.kind === 'markdown') {
      expect(mid.markdown).toContain('Middle reply');
    }
  });
});
