import { createCorrelationAwareSocketIoClient } from '@forepath/framework/backend/util-http-context';
import { Logger } from '@nestjs/common';
import type { Socket as ClientSocket } from 'socket.io-client';

export interface ConsoleLiveAgentWatchCallbacks {
  onChatMessage: (payload: unknown) => void;
  onChatEvent: (payload: unknown) => void;
  onFileUpdateNotification: () => void;
  onDisconnected: () => void;
}

/**
 * Long-lived Socket.IO client to agent-manager `/agents` for one environment.
 */
export class ConsoleLiveAgentWatch {
  private readonly logger = new Logger(ConsoleLiveAgentWatch.name);
  private remote: ClientSocket | null = null;
  private stopping = false;

  constructor(
    private readonly clientId: string,
    private readonly agentId: string,
    private readonly remoteUrl: string,
    private readonly authHeader: string,
    private readonly password: string,
    private readonly rejectUnauthorized: boolean,
    private readonly callbacks: ConsoleLiveAgentWatchCallbacks,
  ) {}

  async start(): Promise<void> {
    this.stopping = false;
    const remote = createCorrelationAwareSocketIoClient(this.remoteUrl, {
      transports: ['websocket'],
      extraHeaders: { Authorization: this.authHeader },
      rejectUnauthorized: this.rejectUnauthorized,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.remote = remote;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Console live watch connection timeout'));
      }, 15000);
      const cleanup = (): void => {
        clearTimeout(timeout);
        remote.off('connect', onConnect);
        remote.off('connect_error', onError);
      };
      const onConnect = (): void => {
        cleanup();
        resolve();
      };
      const onError = (err: Error): void => {
        cleanup();
        reject(err);
      };

      remote.once('connect', onConnect);
      remote.once('connect_error', onError);
    });

    await this.login(remote);

    remote.onAny((event: string, ...args: unknown[]) => {
      if (this.stopping) {
        return;
      }

      if (event === 'chatMessage') {
        this.callbacks.onChatMessage(args[0]);
      } else if (event === 'chatEvent') {
        this.callbacks.onChatEvent(args[0]);
      } else if (event === 'fileUpdateNotification') {
        this.callbacks.onFileUpdateNotification();
      }
    });

    remote.on('disconnect', () => {
      if (!this.stopping) {
        this.callbacks.onDisconnected();
      }
    });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const remote = this.remote;

    this.remote = null;

    if (remote) {
      remote.removeAllListeners();
      remote.disconnect();
    }
  }

  private login(remote: ClientSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Console live watch login timeout'));
      }, 10000);
      const cleanup = (): void => {
        clearTimeout(timeout);
        remote.off('loginSuccess', onSuccess);
        remote.off('loginError', onError);
      };
      const onSuccess = (): void => {
        cleanup();
        resolve();
      };
      const onError = (errorData: unknown): void => {
        cleanup();
        const error = errorData as { error?: { message?: string } };

        reject(new Error(error?.error?.message || 'Login failed'));
      };

      remote.once('loginSuccess', onSuccess);
      remote.once('loginError', onError);
      remote.emit('login', { agentId: this.agentId, password: this.password });
    });
  }
}
