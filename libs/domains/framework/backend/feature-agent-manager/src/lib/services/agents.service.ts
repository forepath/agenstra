import { BadRequestException, forwardRef, Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as sshpk from 'sshpk';
import { v4 as uuidv4 } from 'uuid';
import { AgentResponseDto } from '../dto/agent-response.dto';
import { CreateAgentResponseDto } from '../dto/create-agent-response.dto';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentEntity, ContainerType } from '../entities/agent.entity';
import { AgentProviderFactory } from '../providers/agent-provider.factory';
import { AgentsRepository } from '../repositories/agents.repository';
import { DeploymentsService } from './deployments.service';
import { DockerService } from './docker.service';
import { PasswordService } from './password.service';

/**
 * Service for agent business logic operations.
 * Orchestrates repository and password service operations.
 */
@Injectable()
export class AgentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgentsService.name);
  private readonly PASSWORD_LENGTH = 16;

  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
    private readonly passwordService: PasswordService,
    private readonly agentProviderFactory: AgentProviderFactory,
    @Inject(forwardRef(() => DeploymentsService))
    private readonly deploymentsService?: DeploymentsService,
  ) {}

  /**
   * Generate a secure random password.
   * Uses alphanumeric characters to ensure compatibility.
   * @returns A random password string of PASSWORD_LENGTH characters
   */
  private generateRandomPassword(): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytesBuffer = randomBytes(this.PASSWORD_LENGTH);
    let password = '';

    for (let i = 0; i < this.PASSWORD_LENGTH; i++) {
      password += charset[randomBytesBuffer[i] % charset.length];
    }

    return password;
  }

  /**
   * Extract the domain from a git repository URL.
   * @param url - The git repository URL (e.g., https://github.com/user/repo.git)
   * @returns The domain (e.g., github.com)
   */
  private extractGitDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // Fallback: try to extract domain from common git URL patterns
      const match = url.match(/@([^/:]+)|:\/\/([^/:]+)/);
      return match ? match[1] || match[2] : 'github.com';
    }
  }

  /**
   * Escape a string for safe shell usage.
   * @param str - The string to escape
   * @returns The escaped string safe for shell usage
   */
  private escapeForShell(str: string): string {
    return `'${str.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Determine whether the configured git repository uses SSH.
   */
  private isSshRepository(url?: string): boolean {
    if (!url) {
      return false;
    }
    return url.startsWith('git@') || url.startsWith('ssh://');
  }

  /**
   * Resolve SSH host information from repository URL.
   */
  private getSshHostInfo(url: string): { host: string; port?: number } {
    if (url.startsWith('ssh://')) {
      const parsed = new URL(url);
      return { host: parsed.hostname, port: parsed.port ? Number(parsed.port) : undefined };
    }

    const scpLikeMatch = url.match(/^[^@]+@([^:]+):/);
    if (scpLikeMatch?.[1]) {
      return { host: scpLikeMatch[1] };
    }

    return { host: this.extractGitDomain(url) };
  }

  /**
   * Get the SSH key filename based on key type.
   * Maps key algorithm to standard SSH key filenames.
   */
  private getSshKeyFilename(keyType: string): string {
    const typeMap: Record<string, string> = {
      rsa: 'id_rsa',
      ed25519: 'id_ed25519',
      ecdsa: 'id_ecdsa',
      dsa: 'id_dsa',
    };

    const normalizedType = keyType.toLowerCase();
    return typeMap[normalizedType] || 'id_rsa'; // Default to RSA if unknown
  }

  /**
   * Prepare SSH key pair information.
   * Returns the private key contents to place inside the container, the public key to share, and the key filename.
   */
  private prepareSshKeyPair(providedPrivateKey?: string): {
    privateKey: string;
    publicKey: string;
    keyFilename: string;
    generated: boolean;
  } {
    let key: sshpk.PrivateKey;
    const generated = false;

    if (providedPrivateKey?.trim()) {
      try {
        key = sshpk.parsePrivateKey(providedPrivateKey.trim(), 'auto');
      } catch (error) {
        this.logger.debug(`Invalid SSH private key provided: ${(error as Error).message}`);
        throw new BadRequestException(
          'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
        );
      }
    } else {
      throw new BadRequestException(
        'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
      );
    }

    const privateKey = key.toString('openssh').trimEnd() + '\n';
    const publicKey = key.toPublic().toString('ssh');
    const keyType = key.type || 'rsa';
    const keyFilename = this.getSshKeyFilename(keyType);

    return { privateKey, publicKey, keyFilename, generated };
  }

  /**
   * Helper to write multi-line content into the agent container via base64 encoding.
   */
  private async writeFileToContainer(containerId: string, filePath: string, contents: string): Promise<void> {
    const base64Content = Buffer.from(contents, 'utf-8').toString('base64');
    const escapedBase64 = this.escapeForShell(base64Content);
    await this.dockerService.sendCommandToContainer(containerId, `echo ${escapedBase64} | base64 -d > ${filePath}`);
  }

  /**
   * Configure SSH credentials inside the container and return key metadata for the API response.
   */
  private async configureSshAccess(
    containerId: string,
    repositoryUrl: string,
    providedPrivateKey?: string,
  ): Promise<{ publicKey: string; privateKey?: string }> {
    const keyPair = this.prepareSshKeyPair(providedPrivateKey);
    const { host, port } = this.getSshHostInfo(repositoryUrl);
    const keyPath = `/root/.ssh/${keyPair.keyFilename}`;

    await this.dockerService.sendCommandToContainer(containerId, 'mkdir -p /root/.ssh');
    await this.dockerService.sendCommandToContainer(containerId, 'chmod 700 /root/.ssh');
    await this.writeFileToContainer(containerId, keyPath, keyPair.privateKey);
    await this.dockerService.sendCommandToContainer(containerId, `chmod 600 ${keyPath}`);

    const sshKeyscanCommand = ['ssh-keyscan', port ? `-p ${port}` : '', host, '>> /root/.ssh/known_hosts', '|| true']
      .filter(Boolean)
      .join(' ');
    await this.dockerService.sendCommandToContainer(containerId, sshKeyscanCommand);
    await this.dockerService.sendCommandToContainer(containerId, 'chmod 600 /root/.ssh/known_hosts || true');

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.generated ? keyPair.privateKey : undefined,
    };
  }

  /**
   * Create .netrc file in the container for git authentication.
   * @param containerId - The ID of the container
   * @param repositoryUrl - The URL of the repository to create the .netrc file for
   * @throws Error if git credentials are not configured
   */
  private async createNetrcFile(containerId: string, repositoryUrl: string): Promise<void> {
    const gitUsername = process.env.GIT_USERNAME;
    const gitToken = process.env.GIT_TOKEN || process.env.GIT_PASSWORD;

    if (!gitUsername || !gitToken || !repositoryUrl) {
      throw new BadRequestException(
        'Git credentials not configured. Please set GIT_USERNAME, GIT_TOKEN (or GIT_PASSWORD), and provide a repositoryUrl in the createNetrcFile.',
      );
    }

    const gitDomain = this.extractGitDomain(repositoryUrl);

    // Construct the entire .netrc file content
    const netrcContent = `machine ${gitDomain}
  login ${gitUsername}
  password ${gitToken}
`;

    // Encode content to base64
    const base64Content = Buffer.from(netrcContent, 'utf-8').toString('base64');
    const escapedPath = this.escapeForShell('/root/.netrc');

    // Write file using base64 decode with stdin input (same approach as agent-file-system.service)
    // Use sh -c to run the command in a shell so redirection works
    // The base64 content is sent to stdin, which base64 -d reads and decodes
    await this.dockerService.sendCommandToContainer(containerId, `sh -c "base64 -d > ${escapedPath}"`, base64Content);

    // Set proper permissions
    await this.dockerService.sendCommandToContainer(containerId, 'chmod 600 /root/.netrc');
  }

  /**
   * Create a new agent with auto-generated password.
   * @param createAgentDto - Data transfer object for creating an agent
   * @returns The created agent response DTO with generated password
   * @throws BadRequestException if agent name already exists
   */
  async create(createAgentDto: CreateAgentDto): Promise<CreateAgentResponseDto> {
    // Check if agent with the same name already exists
    const existingAgent = await this.agentsRepository.findByName(createAgentDto.name);
    if (existingAgent) {
      throw new BadRequestException(`Agent with name '${createAgentDto.name}' already exists`);
    }

    // Generate a random password
    const generatedPassword = this.generateRandomPassword();

    // Hash the password
    const hashedPassword = await this.passwordService.hashPassword(generatedPassword);

    // Define a folder name for the agent
    const agentVolumePath = `/opt/agents/${uuidv4()}`;

    const repositoryUrl = createAgentDto.gitRepositoryUrl || process.env.GIT_REPOSITORY_URL;
    if (!repositoryUrl) {
      throw new BadRequestException(
        'Git repository URL not configured. Please set GIT_REPOSITORY_URL or provide a gitRepositoryUrl in the createAgentDto.',
      );
    }

    const sshRepository = this.isSshRepository(repositoryUrl);

    // Determine agent type (default to 'cursor' for backward compatibility)
    const agentType = createAgentDto.agentType || 'cursor';

    // Get the provider for this agent type to retrieve the Docker image
    const provider = this.agentProviderFactory.getProvider(agentType);
    const dockerImage = provider.getDockerImage();
    const virtualWorkspaceDockerImage = provider.getVirtualWorkspaceDockerImage();
    const sshConnectionDockerImage = provider.getSshConnectionDockerImage();

    // Create a docker container
    const containerId = await this.dockerService.createContainer({
      image: dockerImage,
      env: {
        AGENT_NAME: createAgentDto.name,
        CURSOR_API_KEY: process.env.CURSOR_API_KEY,
        GIT_REPOSITORY_URL: repositoryUrl,
        GIT_USERNAME: process.env.GIT_USERNAME,
        GIT_TOKEN: process.env.GIT_TOKEN,
        GIT_PASSWORD: process.env.GIT_PASSWORD,
        GIT_PRIVATE_KEY: process.env.GIT_PRIVATE_KEY,
      },
      volumes: [
        {
          hostPath: agentVolumePath,
          containerPath: '/app',
          readOnly: false,
        },
      ],
    });

    try {
      if (sshRepository) {
        await this.configureSshAccess(containerId, repositoryUrl, process.env.GIT_PRIVATE_KEY);
      } else {
        // Create .netrc file for git authentication
        await this.createNetrcFile(containerId, repositoryUrl);
      }

      const escapedUrl = this.escapeForShell(repositoryUrl);

      // Clone the repository to the agent volume
      await this.dockerService.sendCommandToContainer(containerId, `sh -c "git clone ${escapedUrl} /app"`);

      // Create SSH connection container
      let sshConnection:
        | {
            containerId: string;
            hostPort: number;
            password: string;
          }
        | undefined;
      if (createAgentDto.createSshConnection && sshConnectionDockerImage) {
        const sshConnectionHostPort = await this.generateRandomSSHPort();
        const sshConnectionPassword = this.generateRandomPassword();
        const sshConnectionContainerId = await this.dockerService.createContainer({
          image: sshConnectionDockerImage,
          env: {
            AGENT_NAME: createAgentDto.name,
            SSH_PASSWORD: sshConnectionPassword,
          },
          volumes: [
            {
              hostPath: agentVolumePath,
              containerPath: '/app',
              readOnly: false,
            },
          ],
          ports: [
            {
              containerPort: 22,
              hostPort: sshConnectionHostPort,
            },
          ],
        });
        sshConnection = {
          containerId: sshConnectionContainerId,
          hostPort: sshConnectionHostPort,
          password: sshConnectionPassword,
        };
      }

      // Create VNC container
      let virtualWorkspace:
        | {
            containerId: string;
            hostPort: number;
            password: string;
          }
        | undefined;
      if (createAgentDto.createVirtualWorkspace && virtualWorkspaceDockerImage) {
        const virtualWorkspaceHostPort = await this.generateRandomVNCPort();
        const virtualWorkspacePassword = this.generateRandomPassword();
        const virtualWorkspaceContainerId = await this.dockerService.createContainer({
          image: virtualWorkspaceDockerImage,
          env: {
            AGENT_NAME: createAgentDto.name,
            CURSOR_API_KEY: process.env.CURSOR_API_KEY,
            GIT_REPOSITORY_URL: repositoryUrl,
            GIT_USERNAME: process.env.GIT_USERNAME,
            GIT_TOKEN: process.env.GIT_TOKEN,
            GIT_PASSWORD: process.env.GIT_PASSWORD,
            GIT_PRIVATE_KEY: process.env.GIT_PRIVATE_KEY,
            VNC_PASSWORD: virtualWorkspacePassword,
          },
          volumes: [
            {
              hostPath: agentVolumePath,
              containerPath: '/root/repository',
              readOnly: false,
            },
          ],
          ports: [
            {
              containerPort: 6080,
              hostPort: virtualWorkspaceHostPort,
            },
          ],
        });

        virtualWorkspace = {
          containerId: virtualWorkspaceContainerId,
          hostPort: virtualWorkspaceHostPort,
          password: virtualWorkspacePassword,
        };
      }

      try {
        let networkId: string | undefined;
        if (createAgentDto.createVirtualWorkspace && virtualWorkspace) {
          networkId = await this.dockerService.createNetwork({
            name: uuidv4(),
            containerIds: [
              containerId,
              ...(virtualWorkspace ? [virtualWorkspace.containerId] : []),
              ...(sshConnection ? [sshConnection.containerId] : []),
            ],
          });
        }

        // Create the agent entity
        const agent = await this.agentsRepository.create({
          name: createAgentDto.name,
          description: createAgentDto.description,
          hashedPassword,
          containerId: containerId,
          volumePath: agentVolumePath,
          agentType: createAgentDto.agentType || 'cursor',
          containerType: createAgentDto.containerType || ContainerType.GENERIC,
          ...(createAgentDto.createVirtualWorkspace &&
            virtualWorkspace && {
              vncContainerId: virtualWorkspace.containerId,
              vncHostPort: virtualWorkspace.hostPort,
              vncNetworkId: networkId,
              vncPassword: virtualWorkspace.password,
            }),
          ...(createAgentDto.createSshConnection &&
            sshConnection && {
              sshContainerId: sshConnection.containerId,
              sshHostPort: sshConnection.hostPort,
              sshPassword: sshConnection.password,
            }),
          gitRepositoryUrl: createAgentDto.gitRepositoryUrl,
        });

        // Create deployment configuration if provided
        if (createAgentDto.deploymentConfiguration && this.deploymentsService) {
          try {
            await this.deploymentsService.upsertConfiguration(agent.id, {
              providerType: createAgentDto.deploymentConfiguration.providerType,
              repositoryId: createAgentDto.deploymentConfiguration.repositoryId,
              defaultBranch: createAgentDto.deploymentConfiguration.defaultBranch,
              workflowId: createAgentDto.deploymentConfiguration.workflowId,
              providerToken: createAgentDto.deploymentConfiguration.providerToken,
              providerBaseUrl: createAgentDto.deploymentConfiguration.providerBaseUrl,
            });
          } catch (error) {
            this.logger.warn(
              `Failed to create deployment configuration for agent ${agent.id}: ${(error as Error).message}`,
            );
            // Don't fail agent creation if deployment config fails
          }
        }

        return {
          ...this.mapToResponseDto(agent),
          password: generatedPassword,
        };
      } catch (error) {
        // Clean up the container if any step after creation fails
        try {
          if (createAgentDto.createVirtualWorkspace && virtualWorkspace) {
            await this.dockerService.deleteContainer(virtualWorkspace.containerId);
          }
          if (createAgentDto.createSshConnection && sshConnection) {
            await this.dockerService.deleteContainer(sshConnection.containerId);
          }
        } catch (cleanupError) {
          // Log cleanup error but don't mask the original error
          // The original error is more important for debugging
          const err = cleanupError as { message?: string; stack?: string };
          this.logger.error(
            `Failed to clean up container ${containerId} after agent creation failure: ${err.message}`,
            err.stack,
          );
        }
        // Re-throw the original error
        throw error;
      }
    } catch (error) {
      // Clean up the container if any step after creation fails
      try {
        await this.dockerService.deleteContainer(containerId);
      } catch (cleanupError) {
        // Log cleanup error but don't mask the original error
        // The original error is more important for debugging
        const err = cleanupError as { message?: string; stack?: string };
        this.logger.error(
          `Failed to clean up container ${containerId} after agent creation failure: ${err.message}`,
          err.stack,
        );
      }
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Find all agents with pagination.
   * @param limit - Maximum number of agents to return
   * @param offset - Number of agents to skip
   * @returns Array of agent response DTOs
   */
  async findAll(limit = 10, offset = 0): Promise<AgentResponseDto[]> {
    const agents = await this.agentsRepository.findAll(limit, offset);
    return agents.map((agent) => this.mapToResponseDto(agent));
  }

  /**
   * Find an agent by ID.
   * @param id - The UUID of the agent
   * @returns The agent response DTO
   * @throws NotFoundException if agent is not found
   */
  async findOne(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);
    return this.mapToResponseDto(agent);
  }

  /**
   * Update an existing agent.
   * Password cannot be updated after creation.
   * @param id - The UUID of the agent to update
   * @param updateAgentDto - Data transfer object for updating an agent
   * @returns The updated agent response DTO
   * @throws NotFoundException if agent is not found
   * @throws BadRequestException if new name conflicts with existing agent
   */
  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<AgentResponseDto> {
    // If name is being updated, check for conflicts
    if (updateAgentDto.name) {
      const existingAgent = await this.agentsRepository.findByName(updateAgentDto.name);
      if (existingAgent && existingAgent.id !== id) {
        throw new BadRequestException(`Agent with name '${updateAgentDto.name}' already exists`);
      }
    }

    // Prepare update data (password cannot be updated)
    const updateData: Partial<AgentEntity> = {
      name: updateAgentDto.name,
      description: updateAgentDto.description,
      ...(updateAgentDto.agentType !== undefined && { agentType: updateAgentDto.agentType }),
      ...(updateAgentDto.containerType !== undefined && { containerType: updateAgentDto.containerType }),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key as keyof AgentEntity] === undefined && delete updateData[key as keyof AgentEntity],
    );

    const agent = await this.agentsRepository.update(id, updateData);

    // Update deployment configuration if provided
    if (updateAgentDto.deploymentConfiguration && this.deploymentsService) {
      try {
        await this.deploymentsService.upsertConfiguration(id, {
          providerType: updateAgentDto.deploymentConfiguration.providerType,
          repositoryId: updateAgentDto.deploymentConfiguration.repositoryId,
          defaultBranch: updateAgentDto.deploymentConfiguration.defaultBranch,
          workflowId: updateAgentDto.deploymentConfiguration.workflowId,
          providerToken: updateAgentDto.deploymentConfiguration.providerToken,
          providerBaseUrl: updateAgentDto.deploymentConfiguration.providerBaseUrl,
        });
      } catch (error) {
        this.logger.warn(`Failed to update deployment configuration for agent ${id}: ${(error as Error).message}`);
        // Don't fail agent update if deployment config fails
      }
    }

    return this.mapToResponseDto(agent);
  }

  /**
   * Delete an agent by ID.
   * @param id - The UUID of the agent to delete
   * @throws NotFoundException if agent is not found
   */
  async remove(id: string): Promise<void> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);

    if (agent.containerId) {
      try {
        await this.dockerService.deleteContainer(agent.containerId);
      } catch (error) {
        this.logger.error(`Failed to delete container ${agent.containerId}: ${error}`);
      }
    }

    if (agent.sshContainerId) {
      try {
        await this.dockerService.deleteContainer(agent.sshContainerId);
      } catch (error) {
        this.logger.error(`Failed to delete container ${agent.sshContainerId}: ${error}`);
      }
    }

    if (agent.vncContainerId) {
      try {
        await this.dockerService.deleteContainer(agent.vncContainerId);
      } catch (error) {
        this.logger.error(`Failed to delete container ${agent.vncContainerId}: ${error}`);
      }
    }

    if (agent.vncNetworkId) {
      try {
        await this.dockerService.deleteNetwork(agent.vncNetworkId);
      } catch (error) {
        this.logger.error(`Failed to delete network ${agent.vncNetworkId}: ${error}`);
      }
    }

    await this.agentsRepository.delete(id);
  }

  /**
   * Start all Docker containers for an agent (main, VNC, SSH).
   * @param id - The UUID of the agent
   * @returns The agent response DTO
   * @throws NotFoundException if agent is not found
   */
  async start(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);

    if (agent.containerId) {
      try {
        await this.dockerService.startContainer(agent.containerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.error(
          `Failed to start agent container ${agent.containerId} for agent ${agent.name}: ${err.message}`,
          err.stack,
        );
        throw error;
      }
    }

    if (agent.vncContainerId) {
      try {
        await this.dockerService.startContainer(agent.vncContainerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(
          `Failed to start VNC container ${agent.vncContainerId} for agent ${agent.name}: ${err.message}`,
        );
      }
    }

    if (agent.sshContainerId) {
      try {
        await this.dockerService.startContainer(agent.sshContainerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(
          `Failed to start SSH container ${agent.sshContainerId} for agent ${agent.name}: ${err.message}`,
        );
      }
    }

    return this.mapToResponseDto(agent);
  }

  /**
   * Stop all Docker containers for an agent (main, VNC, SSH).
   * @param id - The UUID of the agent
   * @returns The agent response DTO
   * @throws NotFoundException if agent is not found
   */
  async stop(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);

    if (agent.containerId) {
      try {
        await this.dockerService.stopContainer(agent.containerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.error(
          `Failed to stop agent container ${agent.containerId} for agent ${agent.name}: ${err.message}`,
          err.stack,
        );
        throw error;
      }
    }

    if (agent.vncContainerId) {
      try {
        await this.dockerService.stopContainer(agent.vncContainerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(
          `Failed to stop VNC container ${agent.vncContainerId} for agent ${agent.name}: ${err.message}`,
        );
      }
    }

    if (agent.sshContainerId) {
      try {
        await this.dockerService.stopContainer(agent.sshContainerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(
          `Failed to stop SSH container ${agent.sshContainerId} for agent ${agent.name}: ${err.message}`,
        );
      }
    }

    return this.mapToResponseDto(agent);
  }

  /**
   * Restart all Docker containers for an agent (main, VNC, SSH).
   * @param id - The UUID of the agent
   * @returns The agent response DTO
   * @throws NotFoundException if agent is not found
   */
  async restart(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);

    if (agent.containerId) {
      try {
        await this.dockerService.restartContainer(agent.containerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.error(
          `Failed to restart agent container ${agent.containerId} for agent ${agent.name}: ${err.message}`,
          err.stack,
        );
        throw error;
      }
    }

    if (agent.vncContainerId) {
      try {
        await this.dockerService.restartContainer(agent.vncContainerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(
          `Failed to restart VNC container ${agent.vncContainerId} for agent ${agent.name}: ${err.message}`,
        );
      }
    }

    if (agent.sshContainerId) {
      try {
        await this.dockerService.restartContainer(agent.sshContainerId);
      } catch (error: unknown) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(
          `Failed to restart SSH container ${agent.sshContainerId} for agent ${agent.name}: ${err.message}`,
        );
      }
    }

    return this.mapToResponseDto(agent);
  }

  /**
   * Verify agent credentials.
   * @param id - The UUID of the agent
   * @param password - The plain text password to verify
   * @returns True if credentials are valid, false otherwise
   */
  async verifyCredentials(id: string, password: string): Promise<boolean> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent) {
      return false;
    }
    return await this.passwordService.verifyPassword(password, agent.hashedPassword);
  }

  /**
   * Map agent entity to response DTO.
   * Excludes sensitive information like password hash.
   * @param agent - The agent entity to map
   * @returns The agent response DTO
   */
  private mapToResponseDto(agent: AgentEntity): AgentResponseDto {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      agentType: agent.agentType,
      containerType: agent.containerType,
      vnc: agent.vncHostPort
        ? {
            port: agent.vncHostPort,
            password: agent.vncPassword,
          }
        : undefined,
      ssh: agent.sshHostPort
        ? {
            port: agent.sshHostPort,
            password: agent.sshPassword,
          }
        : undefined,
      git: agent.gitRepositoryUrl
        ? {
            repositoryUrl: agent.gitRepositoryUrl,
          }
        : undefined,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  /**
   * Generate a random public port from a range of ports.
   * @param range - The range of ports to generate a random port from
   * @returns A random public port
   */
  private async generateRandomVNCPort(): Promise<number> {
    const range = process.env.VNC_SERVER_PUBLIC_PORTS || '49152-57343';

    const [start, end] = range.split('-').map(Number);
    const prosedPort = Math.floor(Math.random() * (end - start + 1)) + start;

    if (await this.agentsRepository.findPortInUse(prosedPort)) {
      return await this.generateRandomVNCPort();
    }

    return prosedPort;
  }

  /**
   * Generate a random public port from a range of ports.
   * @param range - The range of ports to generate a random port from
   * @returns A random public port
   */
  private async generateRandomSSHPort(): Promise<number> {
    const range = process.env.SSH_SERVER_PUBLIC_PORTS || '57344-65535';

    const [start, end] = range.split('-').map(Number);
    const prosedPort = Math.floor(Math.random() * (end - start + 1)) + start;

    if (await this.agentsRepository.findPortInUse(prosedPort)) {
      return await this.generateRandomSSHPort();
    }

    return prosedPort;
  }

  /**
   * Restart all Docker containers associated with agents (agent containers and VNC containers).
   * This ensures volume mounts are set correctly based on the current context.
   * Called automatically on service startup after the module has been initialized.
   */
  async restartAllContainers(): Promise<void> {
    try {
      this.logger.log('🔄 Starting container restart process...');

      // Get all agents that have containers
      const agents = await this.agentsRepository.findAllWithContainers();

      if (agents.length === 0) {
        this.logger.log('ℹ️  No agents with containers found, skipping container restart');
        return;
      }

      this.logger.log(`Found ${agents.length} agent(s) with containers to restart`);

      // Track containers we've already restarted to avoid duplicates
      const restartedContainers = new Set<string>();

      // Restart all agent containers and VNC containers
      for (const agent of agents) {
        // Restart agent container if it exists
        if (agent.containerId && !restartedContainers.has(agent.containerId)) {
          try {
            this.logger.log(`Restarting agent container ${agent.containerId} for agent ${agent.name}`);
            await this.dockerService.restartContainer(agent.containerId);
            restartedContainers.add(agent.containerId);
            this.logger.log(`✅ Successfully restarted agent container ${agent.containerId}`);
          } catch (error: unknown) {
            const err = error as { message?: string; stack?: string };
            this.logger.error(
              `Failed to restart agent container ${agent.containerId} for agent ${agent.name}: ${err.message}`,
              err.stack,
            );
            // Continue with other containers even if one fails
          }
        }

        // Restart VNC container if it exists
        if (agent.vncContainerId && !restartedContainers.has(agent.vncContainerId)) {
          try {
            this.logger.log(`Restarting VNC container ${agent.vncContainerId} for agent ${agent.name}`);
            await this.dockerService.restartContainer(agent.vncContainerId);
            restartedContainers.add(agent.vncContainerId);
            this.logger.log(`✅ Successfully restarted VNC container ${agent.vncContainerId}`);
          } catch (error: unknown) {
            const err = error as { message?: string; stack?: string };
            this.logger.error(
              `Failed to restart VNC container ${agent.vncContainerId} for agent ${agent.name}: ${err.message}`,
              err.stack,
            );
            // Continue with other containers even if one fails
          }
        }

        // Restart SSH container if it exists
        if (agent.sshContainerId && !restartedContainers.has(agent.sshContainerId)) {
          try {
            this.logger.log(`Restarting SSH container ${agent.sshContainerId} for agent ${agent.name}`);
            await this.dockerService.restartContainer(agent.sshContainerId);
            restartedContainers.add(agent.sshContainerId);
            this.logger.log(`✅ Successfully restarted SSH container ${agent.sshContainerId}`);
          } catch (error: unknown) {
            const err = error as { message?: string; stack?: string };
            this.logger.error(
              `Failed to restart SSH container ${agent.sshContainerId} for agent ${agent.name}: ${err.message}`,
              err.stack,
            );
            // Continue with other containers even if one fails
          }
        }
      }

      this.logger.log(`✅ Container restart process completed. Restarted ${restartedContainers.size} container(s)`);
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error during container restart process: ${err.message}`, err.stack);
      // Don't throw - we don't want to prevent service startup if container restart fails
    }
  }

  /**
   * Lifecycle hook called after the application has been fully bootstrapped.
   * This fires after all modules are initialized, migrations have run, and the HTTP server is ready.
   * Restarts all Docker containers to ensure volume mounts are set correctly.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('🚀 Application fully bootstrapped, restarting containers...');
    await this.restartAllContainers();
  }
}
