import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import type { EnvironmentLiveStateDto } from '../dto/environment-live-state.dto';

import { CONSOLE_LIVE_EVENTS } from './console-live-realtime.constants';
import { TicketBoardRealtimeService } from './ticket-board-realtime.service';

/**
 * Emits console live state events to the `console` Socket.IO namespace.
 */
@Injectable()
export class ConsoleLiveRealtimeService {
  private readonly logger = new Logger(ConsoleLiveRealtimeService.name);
  private server: Server | null = null;

  static clientRoom(clientId: string): string {
    return TicketBoardRealtimeService.clientRoom(clientId);
  }

  attachServer(server: Server): void {
    this.server = server;
    this.logger.log('Console live realtime attached to console namespace server');
  }

  emitToClient(clientId: string, event: keyof typeof CONSOLE_LIVE_EVENTS | string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(`Skip emit ${event}: server not attached yet`);

      return;
    }

    const room = ConsoleLiveRealtimeService.clientRoom(clientId);

    this.server.to(room).emit(event, payload);
  }

  emitEnvironmentStateUpsert(clientId: string, state: EnvironmentLiveStateDto): void {
    this.emitToClient(clientId, CONSOLE_LIVE_EVENTS.environmentStateUpsert, state);
  }

  emitEnvironmentStateRemoved(clientId: string, agentId: string): void {
    this.emitToClient(clientId, CONSOLE_LIVE_EVENTS.environmentStateRemoved, { clientId, agentId });
  }
}
