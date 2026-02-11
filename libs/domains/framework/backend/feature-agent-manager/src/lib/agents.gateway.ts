import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentProviderFactory } from './providers/agent-provider.factory';
import { AgentResponseObject } from './providers/agent-provider.interface';
import { ChatFilterFactory } from './providers/chat-filter.factory';
import {
  AppliedFilterInfo,
  FilterApplicationResult,
  FilterContext,
  FilterDirection,
} from './providers/chat-filter.interface';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';

interface LoginPayload {
  agentId: string;
  password: string;
}

interface ChatPayload {
  model?: string;
  message: string;
}

interface FileUpdatePayload {
  filePath: string;
}

interface CreateTerminalPayload {
  sessionId?: string;
  shell?: string;
}

interface TerminalInputPayload {
  sessionId: string;
  data: string;
}

interface CloseTerminalPayload {
  sessionId: string;
}

enum ChatActor {
  AGENT = 'agent',
  USER = 'user',
}

/**
 * Standardized WebSocket response interfaces following best practices.
 * All responses include a timestamp for debugging and traceability.
 */

interface BaseResponse {
  timestamp: string;
}

interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true;
  data: T;
}

interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: string;
  };
}

// Specific response types
interface LoginSuccessData {
  message: string;
  agentId: string;
  agentName: string;
}

interface LogoutSuccessData {
  message: string;
  agentId: string | null;
  agentName: string | null;
}

interface UserChatMessageData {
  from: ChatActor.USER;
  text: string;
  timestamp: string;
}

interface AgentChatMessageData {
  from: ChatActor.AGENT;
  response: AgentResponseObject | string; // Parsed JSON object or raw string if parsing fails
  timestamp: string;
}

type ChatMessageData = UserChatMessageData | AgentChatMessageData;

interface FileUpdateNotificationData {
  socketId: string;
  filePath: string;
  timestamp: string;
}

interface MessageFilterResultData {
  direction: 'incoming' | 'outgoing';
  status: 'allowed' | 'filtered' | 'dropped';
  message: string;
  modifiedMessage?: string;
  appliedFilters: Array<{
    type: string;
    displayName: string;
    matched: boolean;
    reason?: string;
  }>;
  matchedFilter?: {
    type: string;
    displayName: string;
    matched: boolean;
    reason?: string;
  };
  action?: 'drop' | 'flag';
  timestamp: string;
}

// Helper functions to create standardized responses
const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const createErrorResponse = (message: string, code?: string, details?: string): ErrorResponse => ({
  success: false,
  error: {
    message,
    ...(code && { code }),
    ...(details && { details }),
  },
  timestamp: new Date().toISOString(),
});

/**
 * WebSocket gateway for agent chat functionality.
 * Handles WebSocket connections, authentication, and chat message broadcasting.
 * Authenticates sessions exclusively against the database-backed agent management system.
 */
@WebSocketGateway(parseInt(process.env.WEBSOCKET_PORT || '8080'), {
  namespace: 'agents',
  cors: {
    origin: '*', // adjust for production
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: parseInt(process.env.SOCKET_MAX_DISCONNECTION_DURATION || '120000'), // 2 minutes default
    skipMiddlewares: true,
  },
})
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentsGateway.name);

  // Store authenticated agents by socket.id
  // Maps socket.id -> agent UUID
  private authenticatedClients = new Map<string, string>();
  // Store socket references by socket.id for reliable broadcasting
  // Maps socket.id -> Socket instance
  private socketById = new Map<string, Socket>();
  // Store terminal sessions: socket.id + sessionId -> sessionId
  // This ensures terminal sessions are client-specific (socket.id based)
  private terminalSessionsBySocket = new Map<string, Set<string>>();
  // Track agents that have received their first initialization message
  // Maps agent UUID -> boolean (true if initialization message was sent)
  private agentsWithFirstMessageSent = new Set<string>();
  // Track stats intervals per agent UUID
  // Maps agent UUID -> NodeJS.Timeout
  private statsIntervalsByAgent = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
    private readonly agentMessagesService: AgentMessagesService,
    private readonly agentProviderFactory: AgentProviderFactory,
    private readonly chatFilterFactory: ChatFilterFactory,
  ) {}

  /**
   * Handle client connection.
   * @param socket - The connected socket instance
   */
  handleConnection(socket: Socket) {
    if (socket.recovered) {
      this.logger.log(`Client reconnected with state recovery: ${socket.id}`);
    } else {
      this.logger.log(`Client connected: ${socket.id}`);
    }
    // Store socket reference for reliable broadcasting
    this.socketById.set(socket.id, socket);
  }

  /**
   * Handle client disconnection.
   * Cleans up authenticated session and socket reference.
   * @param socket - The disconnected socket instance
   */
  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    const agentUuid = this.authenticatedClients.get(socket.id);
    this.authenticatedClients.delete(socket.id);
    this.socketById.delete(socket.id);
    // Clean up all terminal sessions for this socket
    const sessionIds = this.terminalSessionsBySocket.get(socket.id);
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        try {
          this.dockerService.closeTerminalSession(sessionId);
        } catch (error) {
          const err = error as { message?: string };
          this.logger.warn(`Failed to close terminal session ${sessionId} on disconnect: ${err.message}`);
        }
      }
      this.terminalSessionsBySocket.delete(socket.id);
    }
    // Clean up stats interval if this was the last socket for this agent
    if (agentUuid) {
      this.cleanupStatsIntervalIfNeeded(agentUuid);
    }
  }

  /**
   * Find an agent by UUID or name.
   * Attempts UUID lookup first, then falls back to name lookup.
   * @param identifier - Agent UUID or name
   * @returns Agent UUID if found, null otherwise
   */
  private async findAgentIdByIdentifier(identifier: string): Promise<string | null> {
    // Try UUID lookup first
    const agentById = await this.agentsRepository.findById(identifier);
    if (agentById) {
      return agentById.id;
    }

    // Fallback to name lookup
    const agentByName = await this.agentsRepository.findByName(identifier);
    if (agentByName) {
      return agentByName.id;
    }

    return null;
  }

  /**
   * Broadcast a message to all clients authenticated to a specific agent.
   * This ensures agent-specific messages are only sent to clients logged into that agent.
   * @param agentUuid - The UUID of the agent
   * @param event - The event name to emit
   * @param data - The data to send
   */
  private broadcastToAgent(agentUuid: string, event: string, data: unknown): void {
    // Find all socket IDs authenticated to this agent
    const socketIds: string[] = [];
    for (const [socketId, authenticatedAgentUuid] of this.authenticatedClients.entries()) {
      if (authenticatedAgentUuid === agentUuid) {
        socketIds.push(socketId);
      }
    }

    // Emit to each authenticated socket using stored socket references
    let successCount = 0;
    for (const socketId of socketIds) {
      const socket = this.socketById.get(socketId);
      if (socket && socket.connected) {
        try {
          socket.emit(event, data);
          successCount++;
        } catch (emitError) {
          this.logger.warn(`Failed to emit ${event} to socket ${socketId}: ${emitError}`);
          // Remove stale socket reference if emit fails
          this.socketById.delete(socketId);
        }
      } else if (socket && !socket.connected) {
        // Clean up disconnected socket reference
        this.socketById.delete(socketId);
        this.authenticatedClients.delete(socketId);
      }
    }

    if (successCount > 0) {
      this.logger.debug(`Broadcasted ${event} to ${successCount} client(s) for agent ${agentUuid}`);
    }
  }

  /**
   * Handle agent login authentication.
   * Authenticates against database-backed agent management system.
   * @param data - Login payload containing agentId (UUID or name) and password
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('login')
  async handleLogin(@MessageBody() data: LoginPayload, @ConnectedSocket() socket: Socket) {
    const { agentId, password } = data;

    try {
      // Find agent by UUID or name
      const agentUuid = await this.findAgentIdByIdentifier(agentId);
      if (!agentUuid) {
        socket.emit('loginError', createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'));
        this.logger.warn(`Failed login attempt: agent not found (${agentId})`);
        return;
      }

      // Verify credentials
      const isValid = await this.agentsService.verifyCredentials(agentUuid, password);
      if (!isValid) {
        socket.emit('loginError', createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'));
        this.logger.warn(`Failed login attempt: invalid password for agent ${agentUuid}`);
        return;
      }

      // Check if socket was already authenticated (e.g., via connection state recovery)
      const wasAlreadyAuthenticated = this.authenticatedClients.has(socket.id);
      const wasRecovered = socket.recovered;

      // Store authenticated session
      this.authenticatedClients.set(socket.id, agentUuid);

      // Get agent details for welcome message
      const agent = await this.agentsService.findOne(agentUuid);
      socket.emit(
        'loginSuccess',
        createSuccessResponse<LoginSuccessData>({
          message: `Welcome, ${agent.name}!`,
          agentId: agentUuid,
          agentName: agent.name,
        }),
      );
      this.logger.log(`Agent ${agent.name} (${agentUuid}) authenticated on socket ${socket.id}`);

      // Only restore chat history if:
      // 1. The socket was not recovered (Socket.IO's connection state recovery already restores messages)
      // 2. The socket was not already authenticated (to avoid restoring history twice)
      // This prevents duplicate messages when logging in after reconnection
      if (!wasRecovered && !wasAlreadyAuthenticated) {
        // Restore chat history
        await this.restoreChatHistory(agentUuid, socket);
      } else {
        this.logger.debug(
          `Skipping chat history restoration for agent ${agentUuid} on socket ${socket.id} because socket was ${wasRecovered ? 'recovered' : 'already authenticated'}`,
        );
      }

      // Start periodic stats broadcasting and send first stats immediately
      await this.startStatsBroadcasting(agentUuid);
    } catch (error) {
      socket.emit('loginError', createErrorResponse('Invalid credentials', 'LOGIN_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Login error for agent ${agentId}: ${err.message}`, err.stack);
    }
  }

  /**
   * Restore and re-emit chat history for an agent.
   * Messages are emitted in chronological order by their creation date.
   * @param agentUuid - The UUID of the agent
   * @param socket - The socket instance to emit messages to
   */
  private async restoreChatHistory(agentUuid: string, socket: Socket): Promise<void> {
    try {
      // Get total message count to calculate offset for latest messages
      const totalCount = await this.agentMessagesService.countMessages(agentUuid);
      const limit = 20;
      // Calculate offset to get the latest 20 messages
      // If totalCount <= 20, offset is 0 (get all messages)
      // Otherwise, offset = totalCount - 20 (skip older messages)
      const offset = Math.max(0, totalCount - limit);

      // Fetch chat history (ordered chronologically by createdAt ASC)
      // Only restore the most recent 20 messages
      const chatHistory = await this.agentMessagesService.getChatHistory(agentUuid, limit, offset);

      if (chatHistory.length === 0) {
        this.logger.debug(`No chat history found for agent ${agentUuid}`);
        return;
      }

      this.logger.log(`Restoring ${chatHistory.length} messages for agent ${agentUuid}`);

      // Emit each message in chronological order
      for (const messageEntity of chatHistory) {
        const timestamp = messageEntity.createdAt.toISOString();

        // If message was filtered, send filter result before the message (maintains chronological order)
        if (messageEntity.filtered) {
          const direction: 'incoming' | 'outgoing' = messageEntity.actor === 'user' ? 'incoming' : 'outgoing';
          // Create a simplified filter result for restored messages
          // We don't have the full filter details, but we know it was flagged (not dropped, since it was persisted)
          const filterResult: MessageFilterResultData = {
            direction,
            status: 'filtered',
            message: messageEntity.message,
            appliedFilters: [], // We don't have historical filter details
            matchedFilter: undefined,
            action: 'flag', // Since it was persisted, it must have been flagged, not dropped
            timestamp,
          };
          socket.emit('messageFilterResult', createSuccessResponse<MessageFilterResultData>(filterResult));
        }

        if (messageEntity.actor === 'user') {
          // User message: emit with text field
          socket.emit(
            'chatMessage',
            createSuccessResponse<ChatMessageData>({
              from: ChatActor.USER,
              text: messageEntity.message,
              timestamp,
            }),
          );
        } else if (messageEntity.actor === 'agent') {
          // Agent message: apply the same cleaning and parsing logic as live communication
          // The stored message might be:
          // 1. A JSON string (from successful parse) - will parse successfully
          // 2. A cleaned string (toParse from failed parse) - might parse now or remain as string
          let toParse = messageEntity.message;

          // Apply the same cleaning logic as in handleChat
          // Remove everything before the first { in the string
          const firstBrace = toParse.indexOf('{');
          if (firstBrace !== -1) {
            toParse = toParse.slice(firstBrace);
          }
          // Remove everything after the last } in the string
          const lastBrace = toParse.lastIndexOf('}');
          if (lastBrace !== -1) {
            toParse = toParse.slice(0, lastBrace + 1);
          }

          let response: AgentResponseObject | string;
          try {
            // Try to parse the cleaned string
            const parsed = JSON.parse(toParse);
            response = parsed;
          } catch {
            // If parsing fails, use the cleaned string (same as live communication)
            response = toParse;
          }

          socket.emit(
            'chatMessage',
            createSuccessResponse<ChatMessageData>({
              from: ChatActor.AGENT,
              response,
              timestamp,
            }),
          );
        }
      }

      this.logger.debug(`Successfully restored ${chatHistory.length} messages for agent ${agentUuid}`);
    } catch (error) {
      const err = error as { message?: string; stack?: string };
      this.logger.warn(`Failed to restore chat history for agent ${agentUuid}: ${err.message}`, err.stack);
      // Don't fail login if history restoration fails
    }
  }

  /**
   * Handle chat message broadcasting.
   * Only authenticated agents can send messages.
   * @param data - Chat payload containing message text
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('chat')
  async handleChat(@MessageBody() data: ChatPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const message = data.message?.trim();
    if (!message) {
      return;
    }

    // Create timestamp immediately for consistent message ordering
    const chatTimestamp = new Date().toISOString();

    // Apply incoming filters before processing (single hook point for incoming messages)
    const incomingFilterResult = await this.applyFilters(message, FilterDirection.INCOMING, {
      agentId: agentUuid,
      actor: 'user',
    });

    // Broadcast filter result for incoming filters
    this.broadcastToAgent(
      agentUuid,
      'messageFilterResult',
      createSuccessResponse<MessageFilterResultData>({
        direction: 'incoming',
        ...incomingFilterResult,
      }),
    );

    // If filter says to drop, create fake user message and persist it
    if (incomingFilterResult.status === 'dropped') {
      this.logger.debug(
        `Dropped incoming message for agent ${agentUuid} due to filter: ${incomingFilterResult.matchedFilter?.reason || 'No reason provided'}`,
      );

      // Create fake user message indicating message was dropped
      // This appears on the user side of the chat, not the agent side
      const droppedResponseTimestamp = new Date().toISOString();
      const fakeUserMessage = `Message was dropped by filter: ${incomingFilterResult.matchedFilter?.reason || 'No reason provided'}`;

      // Persist the fake user message
      try {
        await this.agentMessagesService.createUserMessage(agentUuid, fakeUserMessage, false);
      } catch (persistError) {
        const err = persistError as { message?: string };
        this.logger.warn(`Failed to persist dropped message response: ${err.message}`);
      }

      // Broadcast the fake user message (appears on user side)
      this.broadcastToAgent(
        agentUuid,
        'chatMessage',
        createSuccessResponse<ChatMessageData>({
          from: ChatActor.USER,
          text: fakeUserMessage,
          timestamp: droppedResponseTimestamp,
        }),
      );

      return;
    }

    // Use modified message if filter provided one, otherwise use original
    const messageToUse = incomingFilterResult.modifiedMessage ?? message;

    // Broadcast user message immediately so UI shows "agent thinking" right away
    // This is especially important when agent is instantiating
    this.broadcastToAgent(
      agentUuid,
      'chatMessage',
      createSuccessResponse<ChatMessageData>({
        from: ChatActor.USER,
        text: messageToUse,
        timestamp: chatTimestamp,
      }),
    );

    try {
      // Get agent details for display
      const agent = await this.agentsService.findOne(agentUuid);
      this.logger.log(`Agent ${agent.name} (${agentUuid}) says: ${message}`);

      // Check if this is the first message for this agent
      // Send initialization message if agent has no chat history and hasn't received first message
      if (!this.agentsWithFirstMessageSent.has(agentUuid)) {
        const chatHistory = await this.agentMessagesService.getChatHistory(agentUuid, 1, 0);
        if (chatHistory.length === 0) {
          // This is the first message ever - send dummy initialization message first
          const entity = await this.agentsRepository.findById(agentUuid);
          const containerId = entity?.containerId;
          if (containerId) {
            try {
              // Get the appropriate provider based on agent type
              const provider = this.agentProviderFactory.getProvider(entity.agentType || 'cursor');
              await provider.sendInitialization(agent.id, containerId, { model: data.model });
              this.logger.debug(`Sent initialization message to agent ${agentUuid}`);
            } catch (error) {
              const err = error as { message?: string; stack?: string };
              this.logger.warn(
                `Failed to send initialization message to agent ${agentUuid}: ${err.message}`,
                err.stack,
              );
              // Continue with normal flow even if initialization fails
            }
          }
          // Mark agent as having received first message
          this.agentsWithFirstMessageSent.add(agentUuid);
        } else {
          // Agent has chat history, mark as initialized
          this.agentsWithFirstMessageSent.add(agentUuid);
        }
      }

      // Persist user message (with filtered flag if filter matched)
      // Use modified message if filter provided one
      try {
        await this.agentMessagesService.createUserMessage(
          agentUuid,
          messageToUse,
          incomingFilterResult.status === 'filtered',
        );
      } catch (persistError) {
        const err = persistError as { message?: string };
        this.logger.warn(`Failed to persist user message: ${err.message}`);
        // Continue with message broadcasting even if persistence fails
      }

      // Forward message to the agent's container stdin
      // Use modified message if filter provided one
      const entity = await this.agentsRepository.findById(agentUuid);
      const containerId = entity?.containerId;
      if (containerId) {
        // Get the appropriate provider based on agent type
        try {
          const provider = this.agentProviderFactory.getProvider(entity.agentType || 'cursor');
          const agentResponse = await provider.sendMessage(agent.id, containerId, messageToUse, {
            model: data.model,
          });
          // Emit agent's response if there is any
          if (agentResponse && agentResponse.trim()) {
            const agentResponseTimestamp = new Date().toISOString();
            const lines = provider.toParseableStrings(agentResponse);

            for (const toParse of lines) {
              try {
                // Parse JSON response from agent
                const parsedResponse = provider.toUnifiedResponse(toParse);
                if (!parsedResponse) {
                  continue;
                }

                // Convert parsed response to string for filtering
                const agentResponseString = JSON.stringify(parsedResponse);

                // Apply outgoing filters before processing (single hook point for outgoing messages)
                const outgoingFilterResult = await this.applyFilters(agentResponseString, FilterDirection.OUTGOING, {
                  agentId: agentUuid,
                  actor: 'agent',
                });

                // Broadcast filter result for outgoing filters
                this.broadcastToAgent(
                  agentUuid,
                  'messageFilterResult',
                  createSuccessResponse<MessageFilterResultData>({
                    direction: 'outgoing',
                    ...outgoingFilterResult,
                  }),
                );

                // If filter says to drop, replace with fake agent response and persist it
                if (outgoingFilterResult.status === 'dropped') {
                  this.logger.debug(
                    `Dropped outgoing message for agent ${agentUuid} due to filter: ${outgoingFilterResult.matchedFilter?.reason || 'No reason provided'}`,
                  );

                  // Create fake agent response indicating message was dropped
                  const fakeAgentResponse = {
                    type: 'error',
                    is_error: true,
                    result: 'MESSAGE_DROPPED',
                    message: `Message was dropped by filter: ${outgoingFilterResult.matchedFilter?.reason || 'No reason provided'}`,
                  };

                  // Persist the fake agent response as if it was a valid agent response
                  try {
                    await this.agentMessagesService.createAgentMessage(agentUuid, fakeAgentResponse, false);
                  } catch (persistError) {
                    const err = persistError as { message?: string };
                    this.logger.warn(`Failed to persist dropped message response: ${err.message}`);
                  }

                  // Broadcast the fake agent response
                  this.broadcastToAgent(
                    agentUuid,
                    'chatMessage',
                    createSuccessResponse<ChatMessageData>({
                      from: ChatActor.AGENT,
                      response: fakeAgentResponse,
                      timestamp: agentResponseTimestamp,
                    }),
                  );

                  return;
                }

                // Use modified response if filter provided one, otherwise use original
                let responseToUse: AgentResponseObject | string = parsedResponse;
                if (outgoingFilterResult.modifiedMessage !== undefined) {
                  try {
                    // Try to parse the modified message as JSON
                    responseToUse = JSON.parse(outgoingFilterResult.modifiedMessage);
                  } catch {
                    // If parsing fails, use as string
                    responseToUse = outgoingFilterResult.modifiedMessage;
                  }
                }

                // Persist agent message (with filtered flag if filter matched)
                // Use modified response if available
                try {
                  await this.agentMessagesService.createAgentMessage(
                    agentUuid,
                    responseToUse,
                    outgoingFilterResult.status === 'filtered',
                  );
                } catch (persistError) {
                  const err = persistError as { message?: string };
                  this.logger.warn(`Failed to persist agent message: ${err.message}`);
                  // Continue with message broadcasting even if persistence fails
                }

                // Broadcast agent response only to clients authenticated to this agent
                // Use modified response if available
                this.broadcastToAgent(
                  agentUuid,
                  'chatMessage',
                  createSuccessResponse<ChatMessageData>({
                    from: ChatActor.AGENT,
                    response: responseToUse,
                    timestamp: agentResponseTimestamp,
                  }),
                );
              } catch (parseError) {
                // If JSON parsing fails, log error but still emit the cleaned response in response field
                const parseErr = parseError as { message?: string };
                this.logger.warn(`Failed to parse agent response as JSON: ${parseErr.message}`);

                // Apply outgoing filters before processing (single hook point for outgoing messages)
                const outgoingFilterResult = await this.applyFilters(toParse, FilterDirection.OUTGOING, {
                  agentId: agentUuid,
                  actor: 'agent',
                });

                // Broadcast filter result for outgoing filters
                this.broadcastToAgent(
                  agentUuid,
                  'messageFilterResult',
                  createSuccessResponse<MessageFilterResultData>({
                    direction: 'outgoing',
                    ...outgoingFilterResult,
                  }),
                );

                // If filter says to drop, replace with fake agent response and persist it
                if (outgoingFilterResult.status === 'dropped') {
                  this.logger.debug(
                    `Dropped outgoing message for agent ${agentUuid} due to filter: ${outgoingFilterResult.matchedFilter?.reason || 'No reason provided'}`,
                  );

                  // Create fake agent response indicating message was dropped
                  const fakeAgentResponse = {
                    type: 'error',
                    is_error: true,
                    result: 'MESSAGE_DROPPED',
                    message: `Message was dropped by filter: ${outgoingFilterResult.matchedFilter?.reason || 'No reason provided'}`,
                  };

                  // Persist the fake agent response as if it was a valid agent response
                  try {
                    await this.agentMessagesService.createAgentMessage(agentUuid, fakeAgentResponse, false);
                  } catch (persistError) {
                    const err = persistError as { message?: string };
                    this.logger.warn(`Failed to persist dropped message response: ${err.message}`);
                  }

                  // Broadcast the fake agent response
                  this.broadcastToAgent(
                    agentUuid,
                    'chatMessage',
                    createSuccessResponse<ChatMessageData>({
                      from: ChatActor.AGENT,
                      response: fakeAgentResponse,
                      timestamp: agentResponseTimestamp,
                    }),
                  );

                  return;
                }

                // Use modified message if filter provided one, otherwise use cleaned string
                const stringResponseToUse = outgoingFilterResult.modifiedMessage ?? toParse;

                // Persist agent message (cleaned string or modified)
                // This ensures we can attempt to parse it again when restoring chat history
                try {
                  await this.agentMessagesService.createAgentMessage(
                    agentUuid,
                    stringResponseToUse,
                    outgoingFilterResult.status === 'filtered',
                  );
                } catch (persistError) {
                  const err = persistError as { message?: string };
                  this.logger.warn(`Failed to persist agent message: ${err.message}`);
                  // Continue with message broadcasting even if persistence fails
                }

                // Broadcast agent response only to clients authenticated to this agent
                // Use modified message if available
                this.broadcastToAgent(
                  agentUuid,
                  'chatMessage',
                  createSuccessResponse<ChatMessageData>({
                    from: ChatActor.AGENT,
                    response: stringResponseToUse,
                    timestamp: agentResponseTimestamp,
                  }),
                );
              }
            }
          }
        } catch (error) {
          const err = error as { message?: string; stack?: string };
          this.logger.error(`Error getting agent response: ${err.message}`, err.stack);
          // Don't fail the chat message, just log the error
        }
      }
    } catch (error) {
      socket.emit('error', createErrorResponse('Error processing chat message', 'CHAT_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Chat error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle file update notification.
   * Broadcasts file update to all clients authenticated to the same agent.
   * Only authenticated agents can send file updates.
   * @param data - File update payload containing filePath
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('fileUpdate')
  async handleFileUpdate(@MessageBody() data: FileUpdatePayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const filePath = data?.filePath?.trim();

    // Validate payload
    if (!filePath) {
      socket.emit('error', createErrorResponse('filePath is required', 'INVALID_PAYLOAD'));
      return;
    }

    try {
      // Get agent details for logging
      const agent = await this.agentsService.findOne(agentUuid);
      this.logger.log(`Agent ${agent.name} (${agentUuid}) updated file ${filePath} on socket ${socket.id}`);

      const updateTimestamp = new Date().toISOString();

      // Broadcast file update notification to all clients authenticated to this agent
      // The notification includes the socket ID so clients can determine if the update
      // came from themselves (same socket ID) or another client (different socket ID)
      this.broadcastToAgent(
        agentUuid,
        'fileUpdateNotification',
        createSuccessResponse<FileUpdateNotificationData>({
          socketId: socket.id,
          filePath,
          timestamp: updateTimestamp,
        }),
      );
    } catch (error) {
      socket.emit('error', createErrorResponse('Error processing file update', 'FILE_UPDATE_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`File update error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle agent logout.
   * Removes authenticated session and confirms logout.
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('logout')
  async handleLogout(@ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);

    if (agentUuid) {
      // Remove authenticated session
      this.authenticatedClients.delete(socket.id);

      // Clean up stats interval if this was the last socket for this agent
      this.cleanupStatsIntervalIfNeeded(agentUuid);

      try {
        // Get agent details for logging
        const agent = await this.agentsService.findOne(agentUuid);
        this.logger.log(`Agent ${agent.name} (${agentUuid}) logged out from socket ${socket.id}`);

        socket.emit(
          'logoutSuccess',
          createSuccessResponse<LogoutSuccessData>({
            message: 'Logged out successfully',
            agentId: agentUuid,
            agentName: agent.name,
          }),
        );
      } catch (error) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(`Failed to get agent details during logout: ${err.message}`, err.stack);
        // Still emit success since session is already cleared
        socket.emit(
          'logoutSuccess',
          createSuccessResponse<LogoutSuccessData>({
            message: 'Logged out successfully',
            agentId: agentUuid,
            agentName: 'Unknown',
          }),
        );
      }
    } else {
      // Not authenticated, but still acknowledge logout (idempotent)
      socket.emit(
        'logoutSuccess',
        createSuccessResponse<LogoutSuccessData>({
          message: 'Logged out successfully',
          agentId: null,
          agentName: null,
        }),
      );
      this.logger.debug(`Logout requested for unauthenticated socket ${socket.id}`);
    }
  }

  /**
   * Handle terminal session creation.
   * Creates a new TTY session for the authenticated agent's container.
   * Terminal sessions are client-specific (socket.id based).
   * @param data - Create terminal payload containing optional sessionId and shell
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('createTerminal')
  async handleCreateTerminal(@MessageBody() data: CreateTerminalPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    try {
      // Get agent entity to find container
      const entity = await this.agentsRepository.findById(agentUuid);
      const containerId = entity?.containerId;
      if (!containerId) {
        socket.emit('error', createErrorResponse('Agent container not found', 'TERMINAL_ERROR'));
        return;
      }

      // Generate session ID: socket.id + timestamp to ensure uniqueness
      const sessionId = data.sessionId || `${socket.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create terminal session
      const stream = await this.dockerService.createTerminalSession(containerId, sessionId, data.shell || 'sh');

      // Track session for this socket
      let sessions = this.terminalSessionsBySocket.get(socket.id);
      if (!sessions) {
        sessions = new Set<string>();
        this.terminalSessionsBySocket.set(socket.id, sessions);
      }
      sessions.add(sessionId);

      // Set up stream data handler to forward output to client
      stream.on('data', (chunk: Buffer) => {
        if (socket.connected) {
          try {
            socket.emit('terminalOutput', createSuccessResponse({ sessionId, data: chunk.toString('utf-8') }));
          } catch (emitError) {
            this.logger.warn(`Failed to emit terminal output for session ${sessionId}: ${emitError}`);
          }
        }
      });

      // Handle stream end/close to notify client
      stream.on('end', () => {
        if (socket.connected) {
          try {
            socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
          } catch (emitError) {
            this.logger.warn(`Failed to emit terminal closed for session ${sessionId}: ${emitError}`);
          }
        }
        // Clean up session tracking
        const socketSessions = this.terminalSessionsBySocket.get(socket.id);
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
      });

      stream.on('close', () => {
        if (socket.connected) {
          try {
            socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
          } catch (emitError) {
            this.logger.warn(`Failed to emit terminal closed for session ${sessionId}: ${emitError}`);
          }
        }
        // Clean up session tracking
        const socketSessions = this.terminalSessionsBySocket.get(socket.id);
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
      });

      // Emit success response
      socket.emit('terminalCreated', createSuccessResponse({ sessionId }));
      this.logger.log(`Created terminal session ${sessionId} for agent ${agentUuid} on socket ${socket.id}`);
    } catch (error) {
      socket.emit('error', createErrorResponse('Error creating terminal session', 'TERMINAL_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Terminal creation error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle terminal input.
   * Sends input data to a terminal session.
   * Only the socket that created the session can send input (enforced by sessionId format).
   * @param data - Terminal input payload containing sessionId and data
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('terminalInput')
  async handleTerminalInput(@MessageBody() data: TerminalInputPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const { sessionId, data: inputData } = data;

    if (!sessionId || !inputData) {
      socket.emit('error', createErrorResponse('sessionId and data are required', 'INVALID_PAYLOAD'));
      return;
    }

    // Verify session belongs to this socket
    const socketSessions = this.terminalSessionsBySocket.get(socket.id);
    if (!socketSessions || !socketSessions.has(sessionId)) {
      socket.emit('error', createErrorResponse('Terminal session not found or access denied', 'TERMINAL_ERROR'));
      return;
    }

    try {
      await this.dockerService.sendTerminalInput(sessionId, inputData);
    } catch (error) {
      const err = error as { message?: string };
      if (err.message?.includes('not found')) {
        // Session was closed, clean up tracking
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
        socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
      } else {
        socket.emit('error', createErrorResponse('Error sending terminal input', 'TERMINAL_ERROR'));
        this.logger.error(`Terminal input error for session ${sessionId}: ${err.message}`);
      }
    }
  }

  /**
   * Handle terminal session closure.
   * Closes a terminal session.
   * Only the socket that created the session can close it (enforced by sessionId format).
   * @param data - Close terminal payload containing sessionId
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('closeTerminal')
  async handleCloseTerminal(@MessageBody() data: CloseTerminalPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const { sessionId } = data;

    if (!sessionId) {
      socket.emit('error', createErrorResponse('sessionId is required', 'INVALID_PAYLOAD'));
      return;
    }

    // Verify session belongs to this socket
    const socketSessions = this.terminalSessionsBySocket.get(socket.id);
    if (!socketSessions || !socketSessions.has(sessionId)) {
      socket.emit('error', createErrorResponse('Terminal session not found or access denied', 'TERMINAL_ERROR'));
      return;
    }

    try {
      await this.dockerService.closeTerminalSession(sessionId);
      // Clean up session tracking
      socketSessions.delete(sessionId);
      if (socketSessions.size === 0) {
        this.terminalSessionsBySocket.delete(socket.id);
      }
      socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
      this.logger.log(`Closed terminal session ${sessionId} for agent ${agentUuid} on socket ${socket.id}`);
    } catch (error) {
      const err = error as { message?: string };
      if (err.message?.includes('not found')) {
        // Session already closed, clean up tracking
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
        socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
      } else {
        socket.emit('error', createErrorResponse('Error closing terminal session', 'TERMINAL_ERROR'));
        this.logger.error(`Terminal close error for session ${sessionId}: ${err.message}`);
      }
    }
  }

  /**
   * Start periodic stats broadcasting for an agent.
   * Sends the first stats immediately, then continues periodically.
   * @param agentUuid - The UUID of the agent
   */
  private async startStatsBroadcasting(agentUuid: string): Promise<void> {
    // Check if stats interval already exists for this agent
    if (this.statsIntervalsByAgent.has(agentUuid)) {
      this.logger.debug(`Stats broadcasting already active for agent ${agentUuid}`);
      return;
    }

    // Get agent entity to find container
    const entity = await this.agentsRepository.findById(agentUuid);
    const containerId = entity?.containerId;
    if (!containerId) {
      this.logger.debug(`No container found for agent ${agentUuid}, skipping stats broadcasting`);
      return;
    }

    // Send first stats immediately
    await this.broadcastContainerStats(agentUuid, containerId);

    // Set up periodic stats broadcasting (every 5 seconds)
    const interval = setInterval(async () => {
      // Check if agent still has authenticated clients
      const hasAuthenticatedClients = Array.from(this.authenticatedClients.values()).includes(agentUuid);
      if (!hasAuthenticatedClients) {
        // No more authenticated clients, clean up interval
        this.cleanupStatsInterval(agentUuid);
        return;
      }

      try {
        await this.broadcastContainerStats(agentUuid, containerId);
      } catch (error) {
        const err = error as { message?: string };
        this.logger.warn(`Failed to broadcast stats for agent ${agentUuid}: ${err.message}`);
        // Continue broadcasting even if one attempt fails
      }
    }, 5000); // 5 seconds interval

    this.statsIntervalsByAgent.set(agentUuid, interval);
    this.logger.debug(`Started stats broadcasting for agent ${agentUuid}`);
  }

  /**
   * Broadcast container status and stats to all clients authenticated to an agent.
   * Always sends container status (running/stopped). Stats are included only when the container is running.
   * @param agentUuid - The UUID of the agent
   * @param containerId - The container ID
   */
  private async broadcastContainerStats(agentUuid: string, containerId: string): Promise<void> {
    try {
      const status = await this.dockerService.getContainerStatus(containerId);
      const statsTimestamp = new Date().toISOString();

      let stats: Awaited<ReturnType<DockerService['getContainerStats']>> | null = null;
      if (status.running) {
        try {
          stats = await this.dockerService.getContainerStats(containerId);
        } catch (statsError) {
          const err = statsError as { message?: string; stack?: string };
          this.logger.warn(`Failed to get container stats for agent ${agentUuid}: ${err.message}`, err.stack);
        }
      }

      this.broadcastToAgent(
        agentUuid,
        'containerStats',
        createSuccessResponse({
          status,
          stats,
          timestamp: statsTimestamp,
        }),
      );
    } catch (error) {
      const err = error as { message?: string; stack?: string };
      this.logger.warn(`Failed to get container status for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Clean up stats interval for an agent if no more authenticated clients exist.
   * @param agentUuid - The UUID of the agent
   */
  private cleanupStatsIntervalIfNeeded(agentUuid: string): void {
    // Check if there are any authenticated clients for this agent
    const hasAuthenticatedClients = Array.from(this.authenticatedClients.values()).includes(agentUuid);
    if (!hasAuthenticatedClients) {
      this.cleanupStatsInterval(agentUuid);
    }
  }

  /**
   * Clean up stats interval for an agent.
   * @param agentUuid - The UUID of the agent
   */
  private cleanupStatsInterval(agentUuid: string): void {
    const interval = this.statsIntervalsByAgent.get(agentUuid);
    if (interval) {
      clearInterval(interval);
      this.statsIntervalsByAgent.delete(agentUuid);
      this.logger.debug(`Stopped stats broadcasting for agent ${agentUuid}`);
    }
  }

  /**
   * Apply filters to a message based on direction.
   * This is the single hook point for filtering messages.
   * Filters are applied sequentially, and if a filter modifies the message,
   * subsequent filters will receive the modified message.
   * @param message - The message content to filter
   * @param direction - The filter direction (incoming or outgoing)
   * @param context - Optional context about the message
   * @returns Filter application result with all applied filters and final status
   */
  private async applyFilters(
    message: string,
    direction: FilterDirection,
    context?: FilterContext,
  ): Promise<FilterApplicationResult> {
    const filters = this.chatFilterFactory.getFiltersByDirection(direction);
    const appliedFilters: AppliedFilterInfo[] = [];
    let matchedFilter: AppliedFilterInfo | undefined;
    let currentMessage = message; // Track message as it may be modified by filters
    let finalModifiedMessage: string | undefined; // Track the final modified message

    // Apply all applicable filters sequentially
    for (const filter of filters) {
      try {
        const result = await filter.filter(currentMessage, context);
        const filterInfo: AppliedFilterInfo = {
          type: filter.getType(),
          displayName: filter.getDisplayName(),
          matched: result.filtered,
          reason: result.filtered ? result.reason : undefined,
        };
        appliedFilters.push(filterInfo);

        if (result.filtered) {
          // If this is the first filter to match, record it as the matched filter
          if (!matchedFilter) {
            matchedFilter = filterInfo;
          }

          // If filter modified the message, use the modified version for subsequent filters
          if (result.modifiedMessage !== undefined) {
            currentMessage = result.modifiedMessage;
            finalModifiedMessage = result.modifiedMessage; // Track the latest modification
            this.logger.debug(
              `Message modified by ${filter.getType()} (${filter.getDisplayName()}): ${result.reason || 'No reason provided'}`,
            );
          } else {
            this.logger.debug(
              `Message filtered by ${filter.getType()} (${filter.getDisplayName()}): ${result.reason || 'No reason provided'}`,
            );
          }

          // If action is 'drop', stop processing immediately (dropped messages cannot be modified)
          if (result.action === 'drop') {
            return {
              message,
              modifiedMessage: result.modifiedMessage, // Should be undefined for drop
              status: 'dropped',
              appliedFilters,
              matchedFilter,
              action: result.action,
              timestamp: new Date().toISOString(),
            };
          }

          // For 'flag' action, continue processing to allow subsequent filters to modify
          // The final modifiedMessage will be from the last filter that modified it
        }
      } catch (error) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(`Filter ${filter.getType()} failed: ${err.message}`, err.stack);
        // Record filter as applied but failed
        appliedFilters.push({
          type: filter.getType(),
          displayName: filter.getDisplayName(),
          matched: false,
          reason: `Filter error: ${err.message}`,
        });
        // Continue with other filters even if one fails
      }
    }

    // All filters processed
    // If any filter matched, return filtered status with final modified message
    if (matchedFilter) {
      return {
        message,
        modifiedMessage: finalModifiedMessage, // Final modified message from the last filter that modified it
        status: 'filtered',
        appliedFilters,
        matchedFilter,
        action: 'flag', // All matched filters must have been 'flag' (drop would have returned earlier)
        timestamp: new Date().toISOString(),
      };
    }

    // No filters matched, message is allowed
    return {
      message,
      status: 'allowed',
      appliedFilters,
      timestamp: new Date().toISOString(),
    };
  }
}
