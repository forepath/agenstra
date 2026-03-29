import type { TicketResponseDto } from './tickets.types';

export interface TicketGlobalSearchHit {
  ticket: TicketResponseDto;
  /** Root → … → this ticket (titles), for subtask context in UI. */
  pathTitles: string[];
}

function normalizeNeedle(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Whether the ticket matches a non-empty search needle (title, content, or id substring).
 */
export function matchesTicketSearchQuery(ticket: TicketResponseDto, needleLower: string): boolean {
  if (!needleLower) {
    return false;
  }
  const title = ticket.title?.toLowerCase() ?? '';
  const content = ticket.content?.toLowerCase() ?? '';
  const id = ticket.id?.toLowerCase() ?? '';
  return title.includes(needleLower) || content.includes(needleLower) || id.includes(needleLower);
}

/**
 * Titles from workspace root ancestor → `ticketId` (inclusive), using flat `list`. Missing parents yield partial chain.
 */
export function buildTicketBreadcrumbTitles(list: TicketResponseDto[], ticketId: string): string[] {
  const byId = new Map(list.map((t) => [t.id, t]));
  const titles: string[] = [];
  const visited = new Set<string>();
  let cur: TicketResponseDto | undefined = byId.get(ticketId);
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);
    titles.unshift(cur.title);
    const parentId = cur.parentId;
    cur = parentId != null && parentId !== '' ? byId.get(parentId) : undefined;
  }
  return titles;
}

/**
 * Tickets matching `query` in the given workspace list. Empty/whitespace `query` yields no hits.
 * When `clientId` is set, only tickets for that client are considered.
 */
export function filterTicketsForGlobalSearch(
  list: TicketResponseDto[],
  query: string,
  clientId?: string | null,
): TicketGlobalSearchHit[] {
  const needle = normalizeNeedle(query);
  if (!needle) {
    return [];
  }
  const scoped = clientId ? list.filter((t) => t.clientId === clientId) : list;
  const hits: TicketGlobalSearchHit[] = [];
  for (const ticket of scoped) {
    if (matchesTicketSearchQuery(ticket, needle)) {
      hits.push({
        ticket,
        pathTitles: buildTicketBreadcrumbTitles(list, ticket.id),
      });
    }
  }
  return hits.sort((a, b) => {
    const ta = a.ticket.title.toLowerCase();
    const tb = b.ticket.title.toLowerCase();
    if (ta !== tb) {
      return ta.localeCompare(tb);
    }
    return a.ticket.id.localeCompare(b.ticket.id);
  });
}
