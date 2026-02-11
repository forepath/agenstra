import { Injectable, Logger } from '@nestjs/common';
import { DockerService } from '../../services/docker.service';
import { AgentProvider, AgentProviderOptions, AgentResponseObject } from '../agent-provider.interface';

/**
 * Cursor-agent provider implementation.
 * Handles communication with the cursor-agent binary running in Docker containers.
 */
@Injectable()
export class CursorAgentProvider implements AgentProvider {
  private readonly logger = new Logger(CursorAgentProvider.name);
  private static readonly TYPE = 'cursor';

  constructor(private readonly dockerService: DockerService) {}

  /**
   * Get the unique type identifier for this provider.
   * @returns 'cursor'
   */
  getType(): string {
    return CursorAgentProvider.TYPE;
  }

  /**
   * Get the human-readable display name for this provider.
   * @returns 'Cursor'
   */
  getDisplayName(): string {
    return 'Cursor';
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
   * Get the Docker image (including tag) to use for cursor-agent containers.
   * @returns The Docker image string
   */
  getDockerImage(): string {
    return process.env.CURSOR_AGENT_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-worker:latest';
  }

  /**
   * Get the Docker image (including tag) to use for virtual workspace containers created for this provider.
   * @returns The Docker image string
   */
  getVirtualWorkspaceDockerImage(): string {
    return process.env.CURSOR_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-vnc:latest';
  }

  /**
   * Get the Docker image (including tag) to use for SSH connection containers created for this provider.
   * @returns The Docker image string
   */
  getSshConnectionDockerImage(): string {
    return process.env.CURSOR_AGENT_SSH_CONNECTION_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-ssh:latest';
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
    // Build command: cursor-agent with prompt mode and JSON output
    let command = `cursor-agent --print --approve-mcps --force --output-format json --resume ${agentId}-${containerId}`;
    if (options?.model) {
      command += ` --model ${options.model}`;
    }

    // Send the message to STDIN of the command and get the response
    const response = await this.dockerService.sendCommandToContainer(containerId, command, message);
    return response;
  }

  /**
   * Send an initialization message to the cursor-agent.
   * This establishes system context for the agent.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param options - Optional configuration (e.g., model name)
   */
  async sendInitialization(agentId: string, containerId: string, options?: AgentProviderOptions): Promise<void> {
    // Build command: cursor-agent with prompt mode and JSON output
    let command = `cursor-agent --print --approve-mcps --force --output-format json --resume ${agentId}-${containerId}`;
    if (options?.model) {
      command += ` --model ${options.model}`;
    }

    // Send dummy message to container stdin (not persisted or broadcast)
    const instructions = `You are operating in a codebase with a structured command and rules system. Follow these guidelines:

COMMAND SYSTEM:
- Executable commands **CAN** be found in the project folder at .cursor/commands
- Each command **IS** a Markdown (.md) file
- The command invocation format **IS** /{filenamewithoutextension} (where filenamewithoutextension is the filename without the .md extension)
- Example: A file named "ship.md" in .cursor/commands **IS** invoked as /ship
- Commands **MUST** be at the start of a message to be recognized and executed
- When you need to execute a command, you **MUST** look for it in .cursor/commands and invoke it using the /{filenamewithoutextension} format at the beginning of your message

RULES SYSTEM:
- Basic context files **CAN** be found in .cursor/rules
- Rules files **MAY** contain an "alwaysApply" property (this is optional in the system)
- If a rules file has "alwaysApply: true", you **MUST** always read and apply that file regardless of context
- If a rules file has "alwaysApply: false", you **SHALL** only apply that file to files matching the respective "globs:" entries
- The "globs:" property **CONTAINS** comma-separated glob patterns that specify which files the rules apply to
- When processing a file, you **MUST** check all rules files with "alwaysApply: true" and all rules files with "alwaysApply: false" whose globs match the current file path

MESSAGE HANDLING:
- This is a one-time initialization message to establish system context
- All subsequent messages you receive **WILL** be from users
- You **MUST** treat all messages after this initialization as user requests, tasks, or questions
- You **SHALL** respond to user messages as you would in a normal conversation, applying the command and rules system guidelines above`;

    try {
      await this.dockerService.sendCommandToContainer(containerId, command, instructions);
      this.logger.debug(`Sent initialization message to agent ${agentId}`);
    } catch (error) {
      const err = error as { message?: string; stack?: string };
      this.logger.warn(`Failed to send initialization message to agent ${agentId}: ${err.message}`, err.stack);
      // Re-throw to allow caller to handle the error
      throw error;
    }
  }

  /**
   * Convert the response from the agent to a parseable strings.
   * Removes all characters that are not UTF-8 supported.
   * @param response - The response from the agent
   * @returns The parseable strings
   */
  toParseableStrings(response: string): string[] {
    // Extract the response object from the response
    const lines = response.split('\n');
    if (lines.length === 0) {
      return [];
    }

    return lines.map((line) => {
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
  toUnifiedResponse(response: string): AgentResponseObject | undefined {
    return JSON.parse(response) as AgentResponseObject;
  }
}
