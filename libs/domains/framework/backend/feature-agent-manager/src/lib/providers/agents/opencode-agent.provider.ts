import { Injectable, Logger } from '@nestjs/common';
import { DockerService } from '../../services/docker.service';
import { AgentProvider, AgentProviderOptions, AgentResponseObject } from '../agent-provider.interface';

/**
 * OpenCode agent provider implementation.
 * Handles communication with the opencode agent binary running in Docker containers.
 */
@Injectable()
export class OpenCodeAgentProvider implements AgentProvider {
  private readonly logger = new Logger(OpenCodeAgentProvider.name);
  private static readonly TYPE = 'opencode';

  constructor(private readonly dockerService: DockerService) {}

  /**
   * Get the unique type identifier for this provider.
   * @returns 'opencode'
   */
  getType(): string {
    return OpenCodeAgentProvider.TYPE;
  }

  /**
   * Get the human-readable display name for this provider.
   * @returns 'OpenCode'
   */
  getDisplayName(): string {
    return 'OpenCode';
  }

  /**
   * Get the base path for the provider.
   * This is used to construct the API base URL.
   * @returns The base path string (e.g., '/app')
   */
  getBasePath(): string {
    return '/app';
  }

  /**
   * Get the Docker image (including tag) to use for opencode agent containers.
   * @returns The Docker image string
   */
  getDockerImage(): string {
    return process.env.OPENCODE_AGENT_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-worker:latest';
  }

  /**
   * Get the Docker image (including tag) to use for virtual workspace containers created for this provider.
   * @returns The Docker image string
   */
  getVirtualWorkspaceDockerImage(): string {
    return process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-vnc:latest';
  }

  /**
   * Get the Docker image (including tag) to use for SSH connection containers created for this provider.
   * @returns The Docker image string
   */
  getSshConnectionDockerImage(): string {
    return process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-ssh:latest';
  }

  /**
   * Send a message to the cursor-agent and get a response.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param message - The message to send to the agent
   * @param options - Optional configuration (e.g., model name)
   * @returns The agent's response as a string
   */
  async sendMessage(
    agentId: string,
    containerId: string,
    message: string,
    options?: AgentProviderOptions,
  ): Promise<string> {
    // Build command: opencode agent with prompt mode and JSON output
    let command = `opencode run --format json`;
    if (options?.continue === undefined || options?.continue === true) {
      command += ` --continue`;
    }
    if (options?.model && options.model !== 'auto') {
      command += ` --model ${options.model}`;
    }

    // Send the message to STDIN of the command and get the response
    const response = await this.dockerService.sendCommandToContainer(containerId, command, message);

    if (response.includes('Session not found')) {
      return this.sendMessage(agentId, containerId, message, {
        ...options,
        continue: false,
      });
    }

    return response;
  }

  /**
   * Send an initialization message to the opencode-agent.
   * This establishes system context for the agent.
   * @param _agentId - The UUID of the agent (unused for opencode)
   * @param _containerId - The Docker container ID where the agent is running (unused for opencode)
   * @param _options - Optional configuration (e.g., model name) (unused for opencode)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendInitialization(_agentId: string, _containerId: string, _options?: AgentProviderOptions): Promise<void> {
    return;
  }

  /**
   * Convert the response from the agent to parseable strings.
   * Removes all characters that are not UTF-8 supported.
   * @param response - The response from the agent
   * @returns Array of parseable strings with only valid UTF-8 characters
   */
  toParseableStrings(response: string): string[] {
    // Extract the response object from the response
    const lines = response.split('\n');
    if (lines.length === 0) {
      return [];
    }

    // Filter out lines that do not contain a "type":"text" object
    const responseObjects = lines.filter((line) => line.includes('"type":"text"') && !line.includes('"text":""'));
    if (!responseObjects.length) {
      return [];
    }

    return responseObjects.map((line) => {
      // Clean the response: remove everything before first { and after last }
      let toParse = line.trim();

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

      return toParse;
    });
  }

  /**
   * Convert the response from the agent to a unified response object.
   * @param response - The response from the agent
   * @returns The unified response object
   */
  toUnifiedResponse(response: string): AgentResponseObject {
    const responseObject = JSON.parse(response) as {
      type: string;
      timestamp: number;
      sessionID: string;
      part: {
        id: string;
        sessionID: string;
        messageID: string;
        type: 'text';
        text: string;
        time: {
          start: number;
          end: number;
        };
      };
    };

    return {
      type: 'result',
      subtype: 'success',
      result: responseObject.part.text,
    };
  }
}
