import { Test, TestingModule } from '@nestjs/testing';
import { DockerService } from '../../services/docker.service';
import { OpenCodeAgentProvider } from './opencode-agent.provider';

describe('OpenCodeAgentProvider', () => {
  let provider: OpenCodeAgentProvider;
  let dockerService: jest.Mocked<DockerService>;

  const mockDockerService = {
    sendCommandToContainer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenCodeAgentProvider,
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
      ],
    }).compile();

    provider = module.get<OpenCodeAgentProvider>(OpenCodeAgentProvider);
    dockerService = module.get(DockerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENCODE_AGENT_DOCKER_IMAGE;
    delete process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE;
    delete process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE;
  });

  describe('getType', () => {
    it('should return "opencode"', () => {
      expect(provider.getType()).toBe('opencode');
    });
  });

  describe('getDisplayName', () => {
    it('should return "OpenCode"', () => {
      expect(provider.getDisplayName()).toBe('OpenCode');
    });
  });

  describe('getBasePath', () => {
    it('should return "/app"', () => {
      expect(provider.getBasePath()).toBe('/app');
    });
  });

  describe('getDockerImage', () => {
    it('should return default image when OPENCODE_AGENT_DOCKER_IMAGE is not set', () => {
      delete process.env.OPENCODE_AGENT_DOCKER_IMAGE;

      const image = provider.getDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-worker:latest');
    });

    it('should return custom image from OPENCODE_AGENT_DOCKER_IMAGE environment variable', () => {
      process.env.OPENCODE_AGENT_DOCKER_IMAGE = 'custom-registry/custom-image:v1.0.0';

      const image = provider.getDockerImage();

      expect(image).toBe('custom-registry/custom-image:v1.0.0');
    });
  });

  describe('getVirtualWorkspaceDockerImage', () => {
    it('should return default image when OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE is not set', () => {
      delete process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE;

      const image = provider.getVirtualWorkspaceDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-vnc:latest');
    });

    it('should return custom image from OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE environment variable', () => {
      process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE = 'custom-registry/custom-vnc:v1.0.0';

      const image = provider.getVirtualWorkspaceDockerImage();

      expect(image).toBe('custom-registry/custom-vnc:v1.0.0');
    });
  });

  describe('getSshConnectionDockerImage', () => {
    it('should return default image when OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE is not set', () => {
      delete process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE;

      const image = provider.getSshConnectionDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-ssh:latest');
    });

    it('should return custom image from OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE environment variable', () => {
      process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE = 'custom-registry/custom-ssh:v1.0.0';

      const image = provider.getSshConnectionDockerImage();

      expect(image).toBe('custom-registry/custom-ssh:v1.0.0');
    });
  });

  describe('sendMessage', () => {
    const agentId = 'test-agent-id';
    const containerId = 'test-container-id';
    const message = 'Hello, agent!';

    it('should send message to container without model option', async () => {
      const expectedResponse = 'Hello from agent!';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message);

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        'opencode run --format json --continue',
        message,
      );
    });

    it('should send message to container with model option', async () => {
      const expectedResponse = 'Hello from agent!';
      const model = 'gpt-4';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message, { model });

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        `opencode run --format json --continue --model ${model}`,
        message,
      );
    });

    it('should send message without continue flag when continue is false', async () => {
      const expectedResponse = 'Hello from agent!';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message, { continue: false });

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        'opencode run --format json',
        message,
      );
    });

    it('should retry without continue flag when Session not found error occurs', async () => {
      const sessionNotFoundResponse = 'Session not found';
      const expectedResponse = 'Hello from agent!';
      dockerService.sendCommandToContainer
        .mockResolvedValueOnce(sessionNotFoundResponse)
        .mockResolvedValueOnce(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message);

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(2);
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        1,
        containerId,
        'opencode run --format json --continue',
        message,
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        2,
        containerId,
        'opencode run --format json',
        message,
      );
    });

    it('should retry without continue flag and preserve model option when Session not found error occurs', async () => {
      const sessionNotFoundResponse = 'Session not found';
      const expectedResponse = 'Hello from agent!';
      const model = 'gpt-4';
      dockerService.sendCommandToContainer
        .mockResolvedValueOnce(sessionNotFoundResponse)
        .mockResolvedValueOnce(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message, { model });

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(2);
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        1,
        containerId,
        `opencode run --format json --continue --model ${model}`,
        message,
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        2,
        containerId,
        `opencode run --format json --model ${model}`,
        message,
      );
    });

    it('should handle errors from docker service', async () => {
      const error = new Error('Container not found');
      dockerService.sendCommandToContainer.mockRejectedValue(error);

      await expect(provider.sendMessage(agentId, containerId, message)).rejects.toThrow('Container not found');
    });
  });

  describe('sendInitialization', () => {
    const agentId = 'test-agent-id';
    const containerId = 'test-container-id';

    it('should return immediately without sending any command', async () => {
      await provider.sendInitialization(agentId, containerId);

      expect(dockerService.sendCommandToContainer).not.toHaveBeenCalled();
    });

    it('should return immediately even with model option', async () => {
      const model = 'gpt-4';
      await provider.sendInitialization(agentId, containerId, { model });

      expect(dockerService.sendCommandToContainer).not.toHaveBeenCalled();
    });

    it('should not throw errors', async () => {
      await expect(provider.sendInitialization(agentId, containerId)).resolves.toBeUndefined();
    });
  });

  describe('toParseableStrings', () => {
    it('should extract JSON object with type text from response', () => {
      const response = 'Some text before {"type":"text","text":"Hello"} and text after';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Hello"}']);
    });

    it('should return empty array when no type text object found', () => {
      const response = 'Some text without type text';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual([]);
    });

    it('should return empty array when type text object has empty text', () => {
      const response = 'Some text {"type":"text","text":""} more text';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual([]);
    });

    it('should extract JSON object and clean braces', () => {
      const response = 'Prefix {"type":"text","text":"Hello"} suffix';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Hello"}']);
    });

    it('should handle response with text before and after JSON', () => {
      const response = 'Log: {"type":"text","text":"Message"} done';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Message"}']);
    });

    it('should handle multiline response with type text', () => {
      const response = 'Line 1\n{"type":"text","text":"Hello"}\nLine 3';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Hello"}']);
    });

    it('should handle nested JSON objects', () => {
      const response = 'Prefix {"type":"text","text":"Hello","data":{"nested":"value"}} suffix';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Hello","data":{"nested":"value"}}']);
    });

    it('should trim whitespace from extracted JSON', () => {
      const response = '   {"type":"text","text":"Hello"}   ';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Hello"}']);
    });

    it('should handle empty string', () => {
      const response = '';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual([]);
    });

    it('should handle response with only whitespace', () => {
      const response = '   \n\t   ';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual([]);
    });

    it('should extract first matching type text object when multiple exist', () => {
      const response = 'Text {"type":"text","text":"First"} more {"type":"text","text":"Second"} end';
      const result = provider.toParseableStrings(response);

      // The implementation extracts from first { to last } on the line containing type:text
      expect(result).toEqual(['{"type":"text","text":"First"} more {"type":"text","text":"Second"}']);
    });

    it('should handle complex JSON with arrays and nested objects', () => {
      const response = 'Log: {"type":"text","text":"Hello","items":[{"id":1},{"id":2}]} done';
      const result = provider.toParseableStrings(response);

      expect(result).toEqual(['{"type":"text","text":"Hello","items":[{"id":1},{"id":2}]}']);
    });
  });

  describe('toUnifiedResponse', () => {
    it('should parse valid opencode response object', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Hello from agent!',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello from agent!',
      });
    });

    it('should extract text from part object', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Response text',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Response text',
      });
    });

    it('should handle empty text in part object', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: '',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: '',
      });
    });

    it('should handle multiline text in part object', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Line 1\nLine 2\nLine 3',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('should handle text with special characters', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?',
      });
    });

    it('should handle text with unicode characters', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Hello 世界 🌍',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello 世界 🌍',
      });
    });

    it('should always return type "result"', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Any message',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result.type).toBe('result');
    });

    it('should always return subtype "success"', () => {
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: 'Any message',
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result.subtype).toBe('success');
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(10000);
      const response = JSON.stringify({
        type: 'text',
        timestamp: 1234567890,
        sessionID: 'session-123',
        part: {
          id: 'part-1',
          sessionID: 'session-123',
          messageID: 'msg-1',
          type: 'text',
          text: longText,
          time: {
            start: 1234567890,
            end: 1234567900,
          },
        },
      });
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: longText,
      });
      expect(result.result.length).toBe(10000);
    });

    it('should throw error for invalid JSON', () => {
      const response = '{"type":"text","part":{"text":"Hello"'; // Missing closing brace

      expect(() => provider.toUnifiedResponse(response)).toThrow();
    });
  });
});
