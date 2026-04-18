import {
  GitBranchDto,
  GitStatusDto,
  PrepareCleanWorkspaceDto,
  RunVerifierCommandsDto,
  RunVerifierCommandsResponseDto,
} from '@forepath/framework/backend/feature-agent-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationType, ClientEntity } from '@forepath/identity/backend';
import axios, { AxiosError } from 'axios';
import { ClientsRepository } from '../repositories/clients.repository';
import { ClientAgentVcsProxyService } from './client-agent-vcs-proxy.service';
import { ClientsService } from './clients.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ClientAgentVcsProxyService', () => {
  let service: ClientAgentVcsProxyService;
  let clientsService: jest.Mocked<ClientsService>;
  let clientsRepository: jest.Mocked<ClientsRepository>;

  const mockClientId = 'test-client-uuid';
  const mockAgentId = 'test-agent-uuid';

  const mockClientEntity: ClientEntity = {
    id: mockClientId,
    name: 'Test Client',
    description: 'Test Description',
    endpoint: 'https://example.com',
    authenticationType: AuthenticationType.API_KEY,
    apiKey: 'test-api-key',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockClientsService = {
    getAccessToken: jest.fn(),
  };

  const mockClientsRepository = {
    findByIdOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAgentVcsProxyService,
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ClientsRepository, useValue: mockClientsRepository },
      ],
    }).compile();

    service = module.get<ClientAgentVcsProxyService>(ClientAgentVcsProxyService);
    clientsService = module.get(ClientsService);
    clientsRepository = module.get(ClientsRepository);

    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should proxy GET /status with API_KEY auth', async () => {
      const status: GitStatusDto = {
        currentBranch: 'main',
        isClean: true,
        hasUnpushedCommits: false,
        aheadCount: 0,
        behindCount: 0,
        files: [],
      };
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({ status: 200, data: status } as any);

      const result = await service.getStatus(mockClientId, mockAgentId);

      expect(result).toEqual(status);
      expect(clientsRepository.findByIdOrThrow).toHaveBeenCalledWith(mockClientId);
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `https://example.com/api/agents/${mockAgentId}/vcs/status`,
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should use KEYCLOAK token when configured', async () => {
      const keycloakClient = {
        ...mockClientEntity,
        authenticationType: AuthenticationType.KEYCLOAK,
        apiKey: undefined,
      };
      clientsRepository.findByIdOrThrow.mockResolvedValue(keycloakClient);
      clientsService.getAccessToken.mockResolvedValue('jwt-token');
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: {
          currentBranch: 'main',
          isClean: true,
          hasUnpushedCommits: false,
          aheadCount: 0,
          behindCount: 0,
          files: [],
        },
      } as any);

      await service.getStatus(mockClientId, mockAgentId);

      expect(clientsService.getAccessToken).toHaveBeenCalledWith(mockClientId);
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
        }),
      );
    });

    it('should throw NotFoundException when remote returns 404', async () => {
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({
        status: 404,
        data: { message: 'Agent not found' },
      } as any);

      await expect(service.getStatus(mockClientId, mockAgentId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when remote returns 400', async () => {
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({
        status: 400,
        data: { message: 'Dirty tree' },
      } as any);

      await expect(service.getStatus(mockClientId, mockAgentId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when API key is missing for API_KEY client', async () => {
      const noKey = { ...mockClientEntity, apiKey: undefined };
      clientsRepository.findByIdOrThrow.mockResolvedValue(noKey);

      await expect(service.getStatus(mockClientId, mockAgentId)).rejects.toThrow(BadRequestException);
      expect(mockedAxios.request).not.toHaveBeenCalled();
    });

    it('should map axios network error to BadRequestException', async () => {
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      const err = new AxiosError('Network Error');
      err.request = {};
      mockedAxios.request.mockRejectedValue(err);

      await expect(service.getStatus(mockClientId, mockAgentId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFileDiff', () => {
    it('should pass path as query param', async () => {
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: {
          path: 'src/a.ts',
          originalContent: '',
          modifiedContent: '',
          encoding: 'utf-8',
          isBinary: false,
        },
      } as any);

      await service.getFileDiff(mockClientId, mockAgentId, 'src/a.ts');

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `https://example.com/api/agents/${mockAgentId}/vcs/diff`,
          params: { path: 'src/a.ts' },
        }),
      );
    });
  });

  describe('switchBranch', () => {
    it('should encode branch name in URL path', async () => {
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({ status: 204, data: undefined } as any);

      await service.switchBranch(mockClientId, mockAgentId, 'feature/foo bar');

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `https://example.com/api/agents/${mockAgentId}/vcs/branches/${encodeURIComponent('feature/foo bar')}/switch`,
        }),
      );
    });
  });

  describe('prepareCleanWorkspace', () => {
    it('should POST to vcs workspace/prepare-clean', async () => {
      const body: PrepareCleanWorkspaceDto = { baseBranch: 'main' };
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({ status: 204, data: undefined } as any);

      await service.prepareCleanWorkspace(mockClientId, mockAgentId, body);

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `https://example.com/api/agents/${mockAgentId}/vcs/workspace/prepare-clean`,
          data: body,
        }),
      );
    });
  });

  describe('runVerifierCommands', () => {
    it('should POST to automation verify-commands', async () => {
      const body: RunVerifierCommandsDto = {
        commands: [{ cmd: 'npm test' }],
        timeoutMs: 60_000,
      };
      const response: RunVerifierCommandsResponseDto = {
        results: [{ cmd: 'npm test', exitCode: 0, output: 'ok' }],
      };
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({ status: 200, data: response } as any);

      const result = await service.runVerifierCommands(mockClientId, mockAgentId, body);

      expect(result).toEqual(response);
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `https://example.com/api/agents/${mockAgentId}/automation/verify-commands`,
          data: body,
        }),
      );
    });
  });

  describe('getBranches', () => {
    it('should proxy GET /branches', async () => {
      const branches: GitBranchDto[] = [
        {
          name: 'main',
          ref: 'refs/heads/main',
          isCurrent: true,
          isRemote: false,
          commit: 'abc1234',
          message: 'init',
        },
      ];
      clientsRepository.findByIdOrThrow.mockResolvedValue(mockClientEntity);
      mockedAxios.request.mockResolvedValue({ status: 200, data: branches } as any);

      const result = await service.getBranches(mockClientId, mockAgentId);

      expect(result).toEqual(branches);
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `https://example.com/api/agents/${mockAgentId}/vcs/branches`,
        }),
      );
    });
  });
});
