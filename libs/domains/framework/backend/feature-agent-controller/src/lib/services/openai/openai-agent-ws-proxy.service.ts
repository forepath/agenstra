/* eslint-disable @typescript-eslint/no-var-requires */
import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AuthenticationType, ClientAgentCredentialsRepository } from '@forepath/identity/backend';
import type { Socket } from 'socket.io-client';
import { ClientsRepository } from '../../repositories/clients.repository';
import { ClientsService } from '../clients.service';
import { agentResponseToPlainText, parseAgentChatMessage, parseChatEventEnvelope } from './openai-socket-payload.utils';

const REMOTE_CONNECT_TIMEOUT_MS = 15000;
const LOGIN_TIMEOUT_MS = 10000;
const IDLE_RESOLVE_MS = 750;

@Injectable()
export class OpenAiAgentWsProxyService {
  private readonly logger = new Logger(OpenAiAgentWsProxyService.name);

  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly clientsService: ClientsService,
    private readonly clientAgentCredentialsRepository: ClientAgentCredentialsRepository,
  ) {}

  private async getAuthHeader(clientId: string): Promise<string> {
    const clientEntity = await this.clientsRepository.findByIdOrThrow(clientId);
    if (clientEntity.authenticationType === AuthenticationType.API_KEY) {
      if (!clientEntity.apiKey) {
        throw new BadRequestException('API key is not configured for this client');
      }
      return `Bearer ${clientEntity.apiKey}`;
    }
    if (clientEntity.authenticationType === AuthenticationType.KEYCLOAK) {
      const token = await this.clientsService.getAccessToken(clientId);
      return `Bearer ${token}`;
    }
    throw new BadRequestException(`Unsupported authentication type: ${clientEntity.authenticationType}`);
  }

  private buildAgentsWsUrl(endpoint: string, overridePort?: number): string {
    const url = new URL(endpoint);
    const effectivePort = (overridePort && String(overridePort)) || process.env.CLIENTS_REMOTE_WS_PORT || '8080';
    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    const host = url.hostname;
    return `${protocol}://${host}:${effectivePort}/agents`;
  }

  private async connectRemote(clientId: string): Promise<{ remote: Socket; cleanup: () => void }> {
    const client = await this.clientsRepository.findByIdOrThrow(clientId);
    const authHeader = await this.getAuthHeader(clientId);
    const remoteUrl = this.buildAgentsWsUrl(client.endpoint, client.agentWsPort);
    const { io } = require('socket.io-client');
    const remote: Socket = io(remoteUrl, {
      transports: ['websocket'],
      extraHeaders: { Authorization: authHeader },
      rejectUnauthorized: false,
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new BadRequestException('Timed out connecting to agent-manager WebSocket'));
      }, REMOTE_CONNECT_TIMEOUT_MS);
      remote.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      remote.once('connect_error', (err: Error) => {
        clearTimeout(timer);
        reject(new BadRequestException(`Remote WebSocket connection failed: ${err.message}`));
      });
    });

    const cleanup = (): void => {
      try {
        remote.removeAllListeners();
        remote.disconnect();
      } catch {
        // ignore
      }
    };

    return { remote, cleanup };
  }

  private async loginRemote(remote: Socket, agentId: string, password: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new BadRequestException('Timed out during agent WebSocket login'));
      }, LOGIN_TIMEOUT_MS);
      const onOk = (): void => {
        clearTimeout(timer);
        remote.off('loginError', onErr);
        resolve();
      };
      const onErr = (payload: unknown): void => {
        clearTimeout(timer);
        remote.off('loginSuccess', onOk);
        const msg =
          payload && typeof payload === 'object' && 'error' in (payload as object)
            ? String((payload as { error?: { message?: string } }).error?.message || 'Login failed')
            : 'Login failed';
        reject(new BadRequestException(msg));
      };
      remote.once('loginSuccess', onOk);
      remote.once('loginError', onErr);
      remote.emit('login', { agentId, password });
    });
  }

  /**
   * Non-streaming: aggregates agent output for the given correlation id, then resolves after idle gap.
   */
  async completeNonStream(params: {
    clientId: string;
    agentId: string;
    userText: string;
    model?: string;
    correlationId: string;
  }): Promise<string> {
    const creds = await this.clientAgentCredentialsRepository.findByClientAndAgent(params.clientId, params.agentId);
    if (!creds?.password) {
      throw new BadRequestException('No stored agent credentials for this agent; OpenAI bridge unavailable');
    }

    const { remote, cleanup } = await this.connectRemote(params.clientId);
    try {
      await this.loginRemote(remote, params.agentId, creds.password);

      const result = await new Promise<string>((resolve, reject) => {
        const globalTimer = setTimeout(
          () => {
            teardown();
            reject(new BadRequestException('OpenAI bridge request timed out'));
          },
          parseInt(process.env.REQUEST_TIMEOUT || '600000', 10),
        );

        let aggregated = '';
        let idleTimer: NodeJS.Timeout | undefined;

        const teardown = (): void => {
          clearTimeout(globalTimer);
          if (idleTimer) {
            clearTimeout(idleTimer);
          }
          remote.off('chatMessage', onChatMessage);
          remote.off('chatEvent', onChatEvent);
          remote.off('error', onSocketError);
        };

        const scheduleIdleResolve = (): void => {
          if (idleTimer) {
            clearTimeout(idleTimer);
          }
          idleTimer = setTimeout(() => {
            teardown();
            const out = aggregated.trim();
            if (!out) {
              reject(new BadRequestException('Empty response from agent'));
            } else {
              resolve(out);
            }
          }, IDLE_RESOLVE_MS);
        };

        const onChatEvent = (...args: unknown[]): void => {
          const env = parseChatEventEnvelope(args[0]);
          if (!env || env.correlationId !== params.correlationId) {
            return;
          }
          if (env.kind === 'error' && env.payload?.message) {
            teardown();
            reject(new BadRequestException(String(env.payload.message)));
            return;
          }
          if (env.kind === 'assistantDelta' && typeof env.payload?.delta === 'string') {
            aggregated += env.payload.delta;
            scheduleIdleResolve();
          }
          if (env.kind === 'assistantMessage' && typeof env.payload?.text === 'string') {
            aggregated = env.payload.text;
            scheduleIdleResolve();
          }
        };

        const onChatMessage = (...args: unknown[]): void => {
          const msg = parseAgentChatMessage(args[0]);
          if (msg?.from !== 'agent') {
            return;
          }
          const piece = msg.text ?? agentResponseToPlainText(msg.response);
          if (piece) {
            aggregated = aggregated ? `${aggregated}\n\n${piece}` : piece;
            scheduleIdleResolve();
          }
        };

        const onSocketError = (err: unknown): void => {
          teardown();
          const message = err instanceof Error ? err.message : 'WebSocket error';
          reject(new BadRequestException(message));
        };

        remote.on('chatEvent', onChatEvent);
        remote.on('chatMessage', onChatMessage);
        remote.on('error', onSocketError);

        remote.emit('chat', {
          message: params.userText,
          model: params.model,
          correlationId: params.correlationId,
          responseMode: 'single',
        });
      });

      return result;
    } catch (e) {
      this.logger.warn(`OpenAI WS proxy (non-stream) failed: ${(e as Error).message}`);
      throw e;
    } finally {
      cleanup();
    }
  }

  /**
   * Streaming: yields text deltas from assistantDelta events; completes after idle following last delta or final chatMessage.
   */
  async *completeStream(params: {
    clientId: string;
    agentId: string;
    userText: string;
    model?: string;
    correlationId: string;
  }): AsyncGenerator<string, void, unknown> {
    const creds = await this.clientAgentCredentialsRepository.findByClientAndAgent(params.clientId, params.agentId);
    if (!creds?.password) {
      throw new BadRequestException('No stored agent credentials for this agent; OpenAI bridge unavailable');
    }

    const { remote, cleanup } = await this.connectRemote(params.clientId);
    const queue: string[] = [];
    let done = false;
    let error: Error | undefined;
    let notify: (() => void) | undefined;

    const waitChunk = async (): Promise<string | null> =>
      new Promise((resolve) => {
        if (queue.length > 0) {
          resolve(queue.shift() ?? null);
          return;
        }
        if (done) {
          resolve(null);
          return;
        }
        notify = (): void => {
          notify = undefined;
          resolve(queue.shift() ?? null);
        };
      });

    try {
      await this.loginRemote(remote, params.agentId, creds.password);

      let idleTimer: NodeJS.Timeout | undefined;
      const finish = (): void => {
        if (idleTimer) {
          clearTimeout(idleTimer);
        }
        done = true;
        notify?.();
      };

      const bumpIdle = (): void => {
        if (idleTimer) {
          clearTimeout(idleTimer);
        }
        idleTimer = setTimeout(() => {
          finish();
        }, IDLE_RESOLVE_MS);
      };

      const onChatEvent = (...args: unknown[]): void => {
        const env = parseChatEventEnvelope(args[0]);
        if (!env || env.correlationId !== params.correlationId) {
          return;
        }
        if (env.kind === 'error' && env.payload?.message) {
          error = new BadRequestException(String(env.payload.message));
          finish();
          return;
        }
        if (env.kind === 'assistantDelta' && typeof env.payload?.delta === 'string') {
          queue.push(env.payload.delta);
          notify?.();
          bumpIdle();
        }
        if (env.kind === 'assistantMessage' && typeof env.payload?.text === 'string') {
          queue.push(env.payload.text);
          notify?.();
          bumpIdle();
        }
      };

      const onChatMessage = (...args: unknown[]): void => {
        const msg = parseAgentChatMessage(args[0]);
        if (msg?.from !== 'agent') {
          return;
        }
        const piece = msg.text ?? agentResponseToPlainText(msg.response);
        if (piece) {
          queue.push(piece);
          notify?.();
          bumpIdle();
        }
      };

      remote.on('chatEvent', onChatEvent);
      remote.on('chatMessage', onChatMessage);

      const hardTimeout = setTimeout(
        () => {
          error = new BadRequestException('OpenAI bridge stream timed out');
          finish();
        },
        parseInt(process.env.REQUEST_TIMEOUT || '600000', 10),
      );

      remote.emit('chat', {
        message: params.userText,
        model: params.model,
        correlationId: params.correlationId,
        responseMode: 'stream',
      });

      bumpIdle();

      while (!done || queue.length > 0) {
        if (error) {
          throw error;
        }
        const next = await waitChunk();
        if (next) {
          yield next;
        } else if (done) {
          break;
        }
      }

      clearTimeout(hardTimeout);
      if (error) {
        throw error;
      }
    } finally {
      cleanup();
    }
  }

  static newCorrelationId(): string {
    return randomUUID();
  }
}
