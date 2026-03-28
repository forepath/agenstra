import { TicketPriority, TicketStatus } from '../entities/ticket.enums';
import { buildPrototypePrompt } from './tickets-prototype-prompt.utils';

describe('tickets-prototype-prompt.utils', () => {
  it('includes nested children in prompt text', () => {
    const tree = {
      id: 'root',
      title: 'Root',
      content: 'Spec',
      priority: TicketPriority.HIGH,
      status: TicketStatus.TODO,
      children: [
        {
          id: 'c1',
          title: 'Child',
          content: null,
          priority: TicketPriority.LOW,
          status: TicketStatus.DRAFT,
          children: [],
        },
      ],
    };
    const out = buildPrototypePrompt(tree);
    expect(out).toContain('[root]');
    expect(out).toContain('[c1]');
    expect(out).toContain('Child');
  });
});
