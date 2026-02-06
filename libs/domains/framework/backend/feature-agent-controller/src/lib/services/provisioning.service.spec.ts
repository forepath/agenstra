import { BadRequestException, forwardRef, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProvisionServerDto } from '../dto/provision-server.dto';
import { AuthenticationType, ClientEntity } from '../entities/client.entity';
import { ProvisioningReferenceEntity } from '../entities/provisioning-reference.entity';
import { ProvisioningProviderFactory } from '../providers/provisioning-provider.factory';
import { ProvisioningProvider, ProvisionedServer, ServerInfo } from '../providers/provisioning-provider.interface';
import { ProvisioningReferencesRepository } from '../repositories/provisioning-references.repository';
import { ClientsService } from './clients.service';
import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  let service: ProvisioningService;
  let provisioningProviderFactory: jest.Mocked<ProvisioningProviderFactory>;
  let clientsService: jest.Mocked<ClientsService>;
  let provisioningReferencesRepository: jest.Mocked<ProvisioningReferencesRepository>;

  const mockProvider: ProvisioningProvider = {
    getType: jest.fn().mockReturnValue('hetzner'),
    getDisplayName: jest.fn().mockReturnValue('Hetzner Cloud'),
    getServerTypes: jest.fn(),
    provisionServer: jest.fn(),
    deleteServer: jest.fn(),
    getServerInfo: jest.fn(),
  };

  const mockClient: ClientEntity = {
    id: 'client-uuid',
    name: 'test-server',
    description: 'Provisioned via hetzner',
    endpoint: 'http://1.2.3.4:3100',
    authenticationType: AuthenticationType.API_KEY,
    apiKey: 'generated-api-key',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProvisionedServer: ProvisionedServer = {
    serverId: 'server-123',
    name: 'test-server',
    publicIp: '1.2.3.4',
    privateIp: '10.0.0.1',
    endpoint: 'http://1.2.3.4:3100',
    status: 'running',
    metadata: {
      location: 'fsn1',
      datacenter: 'fsn1-dc8',
    },
  };

  const mockServerInfo: ServerInfo = {
    serverId: 'server-123',
    name: 'test-server',
    publicIp: '1.2.3.4',
    privateIp: '10.0.0.1',
    status: 'running',
    metadata: {
      location: 'fsn1',
      datacenter: 'fsn1-dc8',
    },
  };

  const mockProvisioningReference: ProvisioningReferenceEntity = {
    id: 'ref-uuid',
    clientId: 'client-uuid',
    providerType: 'hetzner',
    serverId: 'server-123',
    serverName: 'test-server',
    publicIp: '1.2.3.4',
    privateIp: '10.0.0.1',
    providerMetadata: JSON.stringify({ location: 'fsn1', datacenter: 'fsn1-dc8' }),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    client: mockClient,
  };

  const mockProvisioningProviderFactory = {
    hasProvider: jest.fn(),
    getProvider: jest.fn(),
    getRegisteredTypes: jest.fn(),
  };

  const mockClientsService = {
    create: jest.fn(),
    remove: jest.fn(),
  };

  const mockProvisioningReferencesRepository = {
    create: jest.fn(),
    findByClientId: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisioningService,
        {
          provide: ProvisioningProviderFactory,
          useValue: mockProvisioningProviderFactory,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: 'ClientUsersRepository',
          useValue: {},
        },
        {
          provide: 'ClientUsersService',
          useValue: {},
        },
        {
          provide: ProvisioningReferencesRepository,
          useValue: mockProvisioningReferencesRepository,
        },
      ],
    }).compile();

    service = module.get<ProvisioningService>(ProvisioningService);
    provisioningProviderFactory = module.get(ProvisioningProviderFactory);
    clientsService = module.get(ClientsService);
    provisioningReferencesRepository = module.get(ProvisioningReferencesRepository);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('provisionServer', () => {
    const provisionDto: ProvisionServerDto = {
      providerType: 'hetzner',
      serverType: 'cx11',
      name: 'test-server',
      description: 'Test server',
      location: 'fsn1',
      authenticationType: AuthenticationType.API_KEY,
      agentWsPort: 8080,
    };

    it('should provision a server with API_KEY authentication and create client', async () => {
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.provisionServer as jest.Mock).mockResolvedValue(mockProvisionedServer);
      mockClientsService.create.mockResolvedValue(mockClient);
      mockProvisioningReferencesRepository.create.mockResolvedValue(mockProvisioningReference);

      const result = await service.provisionServer(provisionDto);

      expect(result).toEqual({
        ...mockClient,
        isAutoProvisioned: true,
        providerType: 'hetzner',
        serverId: 'server-123',
        serverName: 'test-server',
        publicIp: '1.2.3.4',
        privateIp: '10.0.0.1',
        serverStatus: 'running',
      });
      expect(result.isAutoProvisioned).toBe(true);

      expect(mockProvisioningProviderFactory.hasProvider).toHaveBeenCalledWith('hetzner');
      expect(mockProvisioningProviderFactory.getProvider).toHaveBeenCalledWith('hetzner');
      expect(mockProvider.provisionServer).toHaveBeenCalledWith(
        expect.objectContaining({
          serverType: 'cx11',
          name: 'test-server',
          description: 'Test server',
          location: 'fsn1',
          userData: expect.any(String),
        }),
      );
      expect(mockClientsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-server',
          description: 'Test server', // Uses provided description
          endpoint: 'http://1.2.3.4:3100',
          authenticationType: AuthenticationType.API_KEY,
          apiKey: expect.any(String),
          agentWsPort: 8080,
        }),
        undefined, // userId
      );
      expect(mockProvisioningReferencesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-uuid',
          providerType: 'hetzner',
          serverId: 'server-123',
          serverName: 'test-server',
          publicIp: '1.2.3.4',
          privateIp: '10.0.0.1',
        }),
      );
    });

    it('should provision a server with KEYCLOAK authentication', async () => {
      const keycloakDto: ProvisionServerDto = {
        ...provisionDto,
        authenticationType: AuthenticationType.KEYCLOAK,
        keycloakClientId: 'keycloak-client-id',
        keycloakClientSecret: 'keycloak-client-secret',
        keycloakRealm: 'test-realm',
      };

      const keycloakClient: ClientEntity = {
        ...mockClient,
        authenticationType: AuthenticationType.KEYCLOAK,
        keycloakClientId: 'keycloak-client-id',
        keycloakClientSecret: 'keycloak-client-secret',
        keycloakRealm: 'test-realm',
        apiKey: undefined,
      };

      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.provisionServer as jest.Mock).mockResolvedValue(mockProvisionedServer);
      mockClientsService.create.mockResolvedValue(keycloakClient);
      mockProvisioningReferencesRepository.create.mockResolvedValue(mockProvisioningReference);

      const result = await service.provisionServer(keycloakDto);

      expect(result.authenticationType).toBe(AuthenticationType.KEYCLOAK);
      expect(mockClientsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticationType: AuthenticationType.KEYCLOAK,
          keycloakClientId: 'keycloak-client-id',
          keycloakClientSecret: 'keycloak-client-secret',
          keycloakRealm: 'test-realm',
        }),
        undefined, // userId
      );
    });

    it('should use provided API key if given', async () => {
      const dtoWithApiKey: ProvisionServerDto = {
        ...provisionDto,
        apiKey: 'custom-api-key-123',
      };

      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.provisionServer as jest.Mock).mockResolvedValue(mockProvisionedServer);
      mockClientsService.create.mockResolvedValue(mockClient);
      mockProvisioningReferencesRepository.create.mockResolvedValue(mockProvisioningReference);

      await service.provisionServer(dtoWithApiKey);

      expect(mockClientsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'custom-api-key-123',
        }),
        undefined, // userId
      );
    });

    it('should generate API key if not provided for API_KEY authentication', async () => {
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.provisionServer as jest.Mock).mockResolvedValue(mockProvisionedServer);
      mockClientsService.create.mockResolvedValue(mockClient);
      mockProvisioningReferencesRepository.create.mockResolvedValue(mockProvisioningReference);

      await service.provisionServer(provisionDto);

      const createCall = mockClientsService.create.mock.calls[0][0];
      expect(createCall.apiKey).toBeDefined();
      expect(createCall.apiKey).toHaveLength(32); // API_KEY_LENGTH
      expect(typeof createCall.apiKey).toBe('string');
    });

    it('should throw BadRequestException when provider is not available', async () => {
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(false);
      mockProvisioningProviderFactory.getRegisteredTypes.mockReturnValue(['aws']);

      await expect(service.provisionServer(provisionDto)).rejects.toThrow(BadRequestException);
      await expect(service.provisionServer(provisionDto)).rejects.toThrow("Provider type 'hetzner' is not available");
    });

    it('should include authentication configuration in user data', async () => {
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.provisionServer as jest.Mock).mockResolvedValue(mockProvisionedServer);
      mockClientsService.create.mockResolvedValue(mockClient);
      mockProvisioningReferencesRepository.create.mockResolvedValue(mockProvisioningReference);

      await service.provisionServer(provisionDto);

      const provisionCall = (mockProvider.provisionServer as jest.Mock).mock.calls[0][0];
      expect(provisionCall.userData).toBeDefined();
      const decodedUserData = Buffer.from(provisionCall.userData, 'base64').toString('utf-8');
      expect(decodedUserData).toContain('agent-manager');
      expect(decodedUserData).toContain('docker-compose.yml');
    });
  });

  describe('deleteProvisionedServer', () => {
    it('should delete server from provider and remove client', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(mockProvisioningReference);
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.deleteServer as jest.Mock).mockResolvedValue(undefined);
      mockClientsService.remove.mockResolvedValue(undefined);

      await service.deleteProvisionedServer('client-uuid');

      expect(mockProvisioningReferencesRepository.findByClientId).toHaveBeenCalledWith('client-uuid');
      expect(mockProvisioningProviderFactory.hasProvider).toHaveBeenCalledWith('hetzner');
      expect(mockProvider.deleteServer).toHaveBeenCalledWith('server-123');
      expect(mockClientsService.remove).toHaveBeenCalledWith('client-uuid', undefined, undefined, true);
    });

    it('should continue with client deletion even if server deletion fails', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(mockProvisioningReference);
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.deleteServer as jest.Mock).mockRejectedValue(new Error('Server deletion failed'));
      mockClientsService.remove.mockResolvedValue(undefined);

      await service.deleteProvisionedServer('client-uuid');

      expect(mockProvider.deleteServer).toHaveBeenCalled();
      expect(mockClientsService.remove).toHaveBeenCalledWith('client-uuid', undefined, undefined, true);
    });

    it('should skip server deletion if provider is not available', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(mockProvisioningReference);
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(false);
      mockClientsService.remove.mockResolvedValue(undefined);

      await service.deleteProvisionedServer('client-uuid');

      expect(mockProvider.deleteServer).not.toHaveBeenCalled();
      expect(mockClientsService.remove).toHaveBeenCalledWith('client-uuid', undefined, undefined, true);
    });

    it('should throw BadRequestException when provisioning reference is not found', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(null);

      await expect(service.deleteProvisionedServer('client-uuid')).rejects.toThrow(BadRequestException);
      await expect(service.deleteProvisionedServer('client-uuid')).rejects.toThrow(
        'No provisioning reference found for client client-uuid',
      );
    });
  });

  describe('getServerInfo', () => {
    it('should return fresh server information from provider', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(mockProvisioningReference);
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.getServerInfo as jest.Mock).mockResolvedValue(mockServerInfo);
      mockProvisioningReferencesRepository.update.mockResolvedValue(mockProvisioningReference);

      const result = await service.getServerInfo('client-uuid');

      expect(result).toEqual({
        serverId: 'server-123',
        serverName: 'test-server',
        publicIp: '1.2.3.4',
        privateIp: '10.0.0.1',
        serverStatus: 'running',
        providerType: 'hetzner',
      });

      expect(mockProvider.getServerInfo).toHaveBeenCalledWith('server-123');
      expect(mockProvisioningReferencesRepository.update).toHaveBeenCalledWith('ref-uuid', {
        publicIp: '1.2.3.4',
        privateIp: '10.0.0.1',
        serverName: 'test-server',
      });
    });

    it('should return stored information when provider is not available', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(mockProvisioningReference);
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(false);

      const result = await service.getServerInfo('client-uuid');

      expect(result).toEqual({
        serverId: 'server-123',
        serverName: 'test-server',
        publicIp: '1.2.3.4',
        privateIp: '10.0.0.1',
        providerType: 'hetzner',
      });

      expect(mockProvider.getServerInfo).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when provisioning reference is not found', async () => {
      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(null);

      await expect(service.getServerInfo('client-uuid')).rejects.toThrow(NotFoundException);
      await expect(service.getServerInfo('client-uuid')).rejects.toThrow(
        'No provisioning reference found for client client-uuid',
      );
    });

    it('should handle server without private IP', async () => {
      const referenceWithoutPrivateIp = {
        ...mockProvisioningReference,
        privateIp: undefined,
      };
      const serverInfoWithoutPrivateIp = {
        ...mockServerInfo,
        privateIp: undefined,
      };

      mockProvisioningReferencesRepository.findByClientId.mockResolvedValue(referenceWithoutPrivateIp);
      mockProvisioningProviderFactory.hasProvider.mockReturnValue(true);
      mockProvisioningProviderFactory.getProvider.mockReturnValue(mockProvider);
      (mockProvider.getServerInfo as jest.Mock).mockResolvedValue(serverInfoWithoutPrivateIp);
      mockProvisioningReferencesRepository.update.mockResolvedValue(referenceWithoutPrivateIp);

      const result = await service.getServerInfo('client-uuid');

      expect(result.privateIp).toBeUndefined();
    });
  });
});
