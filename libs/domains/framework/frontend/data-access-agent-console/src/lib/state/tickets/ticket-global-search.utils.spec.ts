import { EMPTY_TICKET_TASKS, type TicketResponseDto } from './tickets.types';
import {
  buildTicketBreadcrumbTitles,
  filterTicketsForGlobalSearch,
  matchesTicketSearchQuery,
} from './ticket-global-search.utils';

describe('ticket-global-search.utils', () => {
  const t = (overrides: Partial<TicketResponseDto>): TicketResponseDto => ({
    id: 'id-1',
    clientId: 'c1',
    title: 'Alpha',
    content: null,
    priority: 'medium',
    status: 'draft',
    automationEligible: false,
    createdAt: '',
    updatedAt: '',
    tasks: EMPTY_TICKET_TASKS,
    ...overrides,
  });

  describe('matchesTicketSearchQuery', () => {
    it('returns false for empty needle', () => {
      expect(matchesTicketSearchQuery(t({}), '')).toBe(false);
    });

    it('matches title case-insensitively', () => {
      expect(matchesTicketSearchQuery(t({ title: 'Hello World' }), 'hello')).toBe(true);
    });

    it('matches content', () => {
      expect(matchesTicketSearchQuery(t({ content: 'acceptance: foo' }), 'foo')).toBe(true);
    });

    it('matches id substring', () => {
      expect(matchesTicketSearchQuery(t({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }), 'bbbb')).toBe(true);
    });
  });

  describe('buildTicketBreadcrumbTitles', () => {
    it('returns single title for root', () => {
      const root = t({ id: 'r', title: 'Root', parentId: null });
      expect(buildTicketBreadcrumbTitles([root], 'r')).toEqual(['Root']);
    });

    it('builds chain for nested ticket', () => {
      const root = t({ id: 'r', title: 'Root', parentId: null });
      const child = t({ id: 'c', title: 'Child', parentId: 'r' });
      expect(buildTicketBreadcrumbTitles([root, child], 'c')).toEqual(['Root', 'Child']);
    });
  });

  describe('filterTicketsForGlobalSearch', () => {
    it('returns empty when query is blank', () => {
      expect(filterTicketsForGlobalSearch([t({})], '   ', 'c1')).toEqual([]);
    });

    it('includes done and closed tickets', () => {
      const list = [
        t({ id: 'a', title: 'Open', status: 'todo' }),
        t({ id: 'b', title: 'Shipped', status: 'done' }),
        t({ id: 'c', title: 'Wontfix', status: 'closed' }),
      ];
      const ship = filterTicketsForGlobalSearch(list, 'ship', 'c1');
      expect(ship.map((h) => h.ticket.id)).toContain('b');
      const wont = filterTicketsForGlobalSearch(list, 'wont', 'c1');
      expect(wont.map((h) => h.ticket.id)).toContain('c');
    });

    it('filters by clientId when provided', () => {
      const list = [t({ id: 'x', clientId: 'c1', title: 'Same' }), t({ id: 'y', clientId: 'c2', title: 'Same' })];
      expect(filterTicketsForGlobalSearch(list, 'same', 'c1').map((h) => h.ticket.id)).toEqual(['x']);
    });

    it('returns pathTitles for subtask hits', () => {
      const root = t({ id: 'r', title: 'Epic', parentId: null });
      const sub = t({ id: 's', title: 'Task', parentId: 'r' });
      const hits = filterTicketsForGlobalSearch([root, sub], 'task', 'c1');
      expect(hits).toHaveLength(1);
      expect(hits[0].pathTitles).toEqual(['Epic', 'Task']);
    });
  });
});
