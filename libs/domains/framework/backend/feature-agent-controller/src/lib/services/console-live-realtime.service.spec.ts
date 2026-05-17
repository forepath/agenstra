import { CONSOLE_LIVE_EVENTS } from './console-live-realtime.constants';
import { ConsoleLiveRealtimeService } from './console-live-realtime.service';
import { TicketBoardRealtimeService } from './ticket-board-realtime.service';

describe('ConsoleLiveRealtimeService', () => {
  let service: ConsoleLiveRealtimeService;
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });

  beforeEach(() => {
    service = new ConsoleLiveRealtimeService();
    emit.mockClear();
    to.mockClear();
    service.attachServer({ to } as never);
  });

  it('clientRoom delegates to ticket board room naming', () => {
    expect(ConsoleLiveRealtimeService.clientRoom('client-1')).toBe(TicketBoardRealtimeService.clientRoom('client-1'));
  });

  it('emitEnvironmentStateUpsert emits to client room', () => {
    const state = {
      clientId: 'c1',
      agentId: 'a1',
      git: { indicator: null },
      chat: { phase: 'idle' as const },
    };

    service.emitEnvironmentStateUpsert('c1', state);

    expect(to).toHaveBeenCalledWith(TicketBoardRealtimeService.clientRoom('c1'));
    expect(emit).toHaveBeenCalledWith(CONSOLE_LIVE_EVENTS.environmentStateUpsert, state);
  });

  it('emitEnvironmentStateRemoved emits removal payload', () => {
    service.emitEnvironmentStateRemoved('c1', 'a1');

    expect(emit).toHaveBeenCalledWith(CONSOLE_LIVE_EVENTS.environmentStateRemoved, {
      clientId: 'c1',
      agentId: 'a1',
    });
  });

  it('emitToClient is a no-op before server is attached', () => {
    const detached = new ConsoleLiveRealtimeService();

    expect(() => detached.emitToClient('c1', 'custom', {})).not.toThrow();
  });
});
