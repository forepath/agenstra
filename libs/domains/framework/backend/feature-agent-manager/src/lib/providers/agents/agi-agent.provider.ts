import { Injectable, Logger } from '@nestjs/common';
import { AgentProvider, AgentProviderOptions, AgentResponseObject } from '../agent-provider.interface';

/**
 * AGI (AI General Intelligence) agent provider implementation.
 * Handles OpenClaw-based agents. Chat is communicated via OpenClaw gateway WebSocket
 * (proxied through agent-controller), not via Docker exec.
 * This provider returns minimal/no-op implementations for sendMessage/sendInitialization
 * since the real chat flow uses the OpenClaw protocol directly.
 */
@Injectable()
export class AgiAgentProvider implements AgentProvider {
  private readonly logger = new Logger(AgiAgentProvider.name);
  private static readonly TYPE = 'agi';

  /**
   * Get the unique type identifier for this provider.
   * @returns 'agi'
   */
  getType(): string {
    return AgiAgentProvider.TYPE;
  }

  /**
   * Get the human-readable display name for this provider.
   * @returns 'AGI (OpenClaw)'
   */
  getDisplayName(): string {
    return 'AGI (OpenClaw)';
  }

  /**
   * Get the Docker image (including tag) to use for AGI containers.
   * @returns The Docker image string
   */
  getDockerImage(): string {
    return process.env.AGI_AGENT_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-agi:latest';
  }

  /**
   * AGI agents do not use VNC virtual workspace.
   * @returns undefined
   */
  getVirtualWorkspaceDockerImage(): undefined {
    return undefined;
  }

  /**
   * AGI agents do not use SSH connection containers.
   * @returns undefined
   */
  getSshConnectionDockerImage(): undefined {
    return undefined;
  }

  /**
   * AGI chat uses OpenClaw WebSocket protocol, not Docker exec.
   * This is a no-op; the caller should never invoke this for AGI agents.
   * @returns Empty string to satisfy interface
   */
  async sendMessage(
    _agentId: string,
    _containerId: string,
    _message: string,
    _options?: AgentProviderOptions,
  ): Promise<string> {
    this.logger.warn('AGI sendMessage called - chat should use OpenClaw WebSocket proxy, not Docker exec');
    return JSON.stringify({ type: 'error', result: 'AGI chat uses OpenClaw WebSocket' });
  }

  /**
   * AGI agents do not use initialization via Docker exec.
   * This is a no-op.
   */
  async sendInitialization(_agentId: string, _containerId: string, _options?: AgentProviderOptions): Promise<void> {
    return;
  }

  /**
   * Convert the response from the agent to parseable strings.
   * AGI responses come via OpenClaw WebSocket, not Docker exec.
   * @returns Empty array
   */
  toParseableStrings(_response: string): string[] {
    return [];
  }

  /**
   * Convert the response from the agent to a unified response object.
   * @returns undefined for AGI (responses handled by OpenClaw protocol)
   */
  toUnifiedResponse(_response: string): AgentResponseObject | undefined {
    return undefined;
  }
}
