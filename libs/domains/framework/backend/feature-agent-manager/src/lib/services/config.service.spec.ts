import { Test, TestingModule } from '@nestjs/testing';
import { AgentProviderFactory } from '../providers/agent-provider.factory';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let agentProviderFactory: jest.Mocked<AgentProviderFactory>;

  const mockProvider = {
    getType: jest.fn().mockReturnValue('cursor'),
    getDisplayName: jest.fn().mockReturnValue('Cursor'),
    getDockerImage: jest.fn().mockReturnValue('ghcr.io/forepath/agenstra-manager-worker:latest'),
    getVirtualWorkspaceDockerImage: jest.fn().mockReturnValue('ghcr.io/forepath/agenstra-manager-vnc:latest'),
    getSshConnectionDockerImage: jest.fn().mockReturnValue('ghcr.io/forepath/agenstra-manager-ssh:latest'),
    sendMessage: jest.fn(),
    sendInitialization: jest.fn(),
    toParseableStrings: jest.fn(),
    toUnifiedResponse: jest.fn(),
  };

  const mockAgentProviderFactory = {
    getRegisteredTypes: jest.fn(),
    getProvider: jest.fn().mockReturnValue(mockProvider),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: AgentProviderFactory,
          useValue: mockAgentProviderFactory,
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    agentProviderFactory = module.get(AgentProviderFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.GIT_REPOSITORY_URL;
  });

  describe('getGitRepositoryUrl', () => {
    it('should return Git repository URL from environment variable when set', () => {
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';

      const result = service.getGitRepositoryUrl();

      expect(result).toBe('https://github.com/user/repo.git');
    });

    it('should return undefined when Git repository URL is not set', () => {
      delete process.env.GIT_REPOSITORY_URL;

      const result = service.getGitRepositoryUrl();

      expect(result).toBeUndefined();
    });
  });

  describe('getAvailableAgentTypes', () => {
    it('should return array of agent types with display names', () => {
      const agentTypes = ['cursor', 'opencode', 'openclaw'];
      agentProviderFactory.getRegisteredTypes.mockReturnValue(agentTypes);

      const result = service.getAvailableAgentTypes();

      expect(result).toEqual([{ type: 'cursor', displayName: 'Cursor' }]);
      expect(agentProviderFactory.getRegisteredTypes).toHaveBeenCalled();
      expect(agentProviderFactory.getProvider).toHaveBeenCalledWith('cursor');
      expect(mockProvider.getType).toHaveBeenCalled();
      expect(mockProvider.getDisplayName).toHaveBeenCalled();
    });

    it('should return multiple agent types when multiple providers are registered', () => {
      const mockOpenAIProvider = {
        getType: jest.fn().mockReturnValue('openai'),
        getDisplayName: jest.fn().mockReturnValue('OpenAI'),
        getDockerImage: jest.fn().mockReturnValue('openai-image:latest'),
        getVirtualWorkspaceDockerImage: jest.fn().mockReturnValue('openai-virtual-workspace-image:latest'),
        getSshConnectionDockerImage: jest.fn().mockReturnValue('openai-ssh-connection-image:latest'),
        sendMessage: jest.fn(),
        sendInitialization: jest.fn(),
        toParseableStrings: jest.fn(),
        toUnifiedResponse: jest.fn(),
      };
      const mockAnthropicProvider = {
        getType: jest.fn().mockReturnValue('anthropic'),
        getDisplayName: jest.fn().mockReturnValue('Anthropic Claude'),
        getDockerImage: jest.fn().mockReturnValue('anthropic-image:latest'),
        getVirtualWorkspaceDockerImage: jest.fn().mockReturnValue('anthropic-virtual-workspace-image:latest'),
        getSshConnectionDockerImage: jest.fn().mockReturnValue('anthropic-ssh-connection-image:latest'),
        sendMessage: jest.fn(),
        sendInitialization: jest.fn(),
        toParseableStrings: jest.fn(),
        toUnifiedResponse: jest.fn(),
      };

      const agentTypes = ['cursor', 'openai', 'anthropic'];
      agentProviderFactory.getRegisteredTypes.mockReturnValue(agentTypes);
      agentProviderFactory.getProvider
        .mockReturnValueOnce(mockProvider)
        .mockReturnValueOnce(mockOpenAIProvider)
        .mockReturnValueOnce(mockAnthropicProvider);

      const result = service.getAvailableAgentTypes();

      expect(result).toEqual([
        { type: 'cursor', displayName: 'Cursor' },
        { type: 'openai', displayName: 'OpenAI' },
        { type: 'anthropic', displayName: 'Anthropic Claude' },
      ]);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no agent types are registered', () => {
      agentProviderFactory.getRegisteredTypes.mockReturnValue([]);

      const result = service.getAvailableAgentTypes();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(agentProviderFactory.getProvider).not.toHaveBeenCalled();
    });
  });
});
