/** sessionStorage key for one-shot chat input prefill (e.g. ticket prototype → Spaces). */
export const AGENT_CONSOLE_CHAT_DRAFT_STORAGE_KEY = 'agentConsole.chatDraft.v1';

export interface AgentConsoleChatDraftV1 {
  v: 1;
  message: string;
}

export function storeAgentConsoleChatDraft(message: string): void {
  if (typeof sessionStorage === 'undefined' || !message) {
    return;
  }

  const payload: AgentConsoleChatDraftV1 = { v: 1, message };

  sessionStorage.setItem(AGENT_CONSOLE_CHAT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Reads and removes the stored draft. Returns message text or null if missing/invalid.
 */
export function readAndClearAgentConsoleChatDraft(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(AGENT_CONSOLE_CHAT_DRAFT_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(AGENT_CONSOLE_CHAT_DRAFT_STORAGE_KEY);

  try {
    const data = JSON.parse(raw) as AgentConsoleChatDraftV1;

    if (data?.v === 1 && typeof data.message === 'string' && data.message.length > 0) {
      return data.message;
    }
  } catch {
    // ignore
  }

  return null;
}
