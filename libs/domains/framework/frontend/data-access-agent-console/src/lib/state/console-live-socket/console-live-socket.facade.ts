import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { filter, map, Observable, of, switchMap, take, tap } from 'rxjs';

import { getConsoleLiveSocketInstance } from './console-live-socket-instance';
import {
  clearEnvironmentUnread,
  connectConsoleLiveSocket,
  disconnectConsoleLiveSocket,
  setConsoleLiveSocketClient,
} from './console-live-socket.actions';
import {
  selectConsoleLiveSocketConnected,
  selectConsoleLiveSocketConnecting,
  selectConsoleLiveSocketError,
  selectEnvironmentChatPhase,
  selectEnvironmentGitBranch,
  selectEnvironmentGitIndicator,
  selectEnvironmentLiveState,
  selectEnvironmentUnreadCount,
} from './console-live-socket.selectors';
import type { EnvironmentLiveState } from './console-live.types';

@Injectable({
  providedIn: 'root',
})
export class ConsoleLiveSocketFacade {
  private readonly store = inject(Store);

  readonly connected$ = this.store.select(selectConsoleLiveSocketConnected);
  readonly connecting$ = this.store.select(selectConsoleLiveSocketConnecting);
  readonly error$ = this.store.select(selectConsoleLiveSocketError);

  connect(): void {
    this.store.dispatch(connectConsoleLiveSocket());
  }

  disconnect(): void {
    this.store.dispatch(disconnectConsoleLiveSocket());
  }

  setClient(clientId: string): void {
    const socket = getConsoleLiveSocketInstance();

    if (!socket?.connected) {
      return;
    }

    this.store.dispatch(setConsoleLiveSocketClient({ clientId }));
    socket.emit('setClient', { clientId });
  }

  ensureConnectedAndSetClient(clientId: string): Observable<void> {
    return this.connected$.pipe(
      take(1),
      switchMap((ok) => {
        if (!ok) {
          this.connect();

          return this.connected$.pipe(
            filter((connected) => connected),
            take(1),
            tap(() => this.setClient(clientId)),
            map(() => undefined),
          );
        }

        this.setClient(clientId);

        return of(undefined);
      }),
    );
  }

  getEnvironmentLiveState$(clientId: string, agentId: string): Observable<EnvironmentLiveState | null> {
    return this.store.select(selectEnvironmentLiveState(clientId, agentId));
  }

  getGitIndicator$(clientId: string, agentId: string) {
    return this.store.select(selectEnvironmentGitIndicator(clientId, agentId));
  }

  getGitBranch$(clientId: string, agentId: string) {
    return this.store.select(selectEnvironmentGitBranch(clientId, agentId));
  }

  getChatPhase$(clientId: string, agentId: string) {
    return this.store.select(selectEnvironmentChatPhase(clientId, agentId));
  }

  getUnreadCount$(clientId: string, agentId: string) {
    return this.store.select(selectEnvironmentUnreadCount(clientId, agentId));
  }

  clearUnread(clientId: string, agentId: string): void {
    this.store.dispatch(clearEnvironmentUnread({ clientId, agentId }));
  }
}
