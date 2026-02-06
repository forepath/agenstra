import { getAuthenticationMethod } from '@forepath/identity/backend';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KEYCLOAK_CONNECT_OPTIONS, KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
import { ClientsController } from './clients.controller';
import { ClientEntity } from './entities/client.entity';
import { ClientUserEntity } from './entities/client-user.entity';
import { ProvisioningReferenceEntity } from './entities/provisioning-reference.entity';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientsService } from './services/clients.service';
import { KeycloakTokenService } from './services/keycloak-token.service';
import { ClientsModule } from './clients.module';
import { ClientAgentCredentialEntity } from './entities/client-agent-credential.entity';
import { ClientAgentCredentialsService } from './services/client-agent-credentials.service';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientsGateway } from './clients.gateway';
import { SocketAuthService } from './services/socket-auth.service';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

describe('ClientsModule', () => {
  let module: TestingModule;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    findByKeycloakSub: jest.fn().mockResolvedValue(null),
  };

  const mockKeycloakInstance = {
    grantManager: {
      createGrant: jest.fn(),
      validateAccessToken: jest.fn(),
      validateToken: jest.fn(),
    },
  };

  const mockKeycloakOptions = {
    tokenValidation: 'ONLINE' as const,
  };

  beforeEach(async () => {
    const authMethod = getAuthenticationMethod();
    const moduleBuilder = Test.createTestingModule({
      imports: [ClientsModule],
    })
      .overrideProvider(getRepositoryToken(ClientEntity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(ClientAgentCredentialEntity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(ProvisioningReferenceEntity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(ClientUserEntity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(mockRepository)
      .overrideProvider(UsersRepository)
      .useValue(mockRepository);

    // Mock Keycloak providers if auth method is keycloak
    if (authMethod === 'keycloak') {
      moduleBuilder
        .overrideProvider(KEYCLOAK_INSTANCE)
        .useValue(mockKeycloakInstance)
        .overrideProvider(KEYCLOAK_CONNECT_OPTIONS)
        .useValue(mockKeycloakOptions);
    }

    module = await moduleBuilder.compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide ClientsService', () => {
    const service = module.get<ClientsService>(ClientsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ClientsService);
  });

  it('should provide ClientsRepository', () => {
    const repository = module.get<ClientsRepository>(ClientsRepository);
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ClientsRepository);
  });

  it('should provide ClientsController', () => {
    const controller = module.get<ClientsController>(ClientsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ClientsController);
  });

  it('should export ClientsService', () => {
    const service = module.get<ClientsService>(ClientsService);
    expect(service).toBeDefined();
  });

  it('should export ClientsRepository', () => {
    const repository = module.get<ClientsRepository>(ClientsRepository);
    expect(repository).toBeDefined();
  });

  it('should provide KeycloakTokenService', () => {
    const service = module.get<KeycloakTokenService>(KeycloakTokenService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(KeycloakTokenService);
  });

  it('should export KeycloakTokenService', () => {
    const service = module.get<KeycloakTokenService>(KeycloakTokenService);
    expect(service).toBeDefined();
  });

  it('should provide ClientAgentProxyService', () => {
    const service = module.get<ClientAgentProxyService>(ClientAgentProxyService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ClientAgentProxyService);
  });

  it('should export ClientAgentProxyService', () => {
    const service = module.get<ClientAgentProxyService>(ClientAgentProxyService);
    expect(service).toBeDefined();
  });

  it('should provide ClientsGateway', () => {
    const gw = module.get<ClientsGateway>(ClientsGateway);
    expect(gw).toBeDefined();
    expect(gw).toBeInstanceOf(ClientsGateway);
  });

  it('should export ClientsGateway', () => {
    const gw = module.get<ClientsGateway>(ClientsGateway);
    expect(gw).toBeDefined();
  });

  it('should provide ClientAgentCredentialsRepository', () => {
    const repository = module.get<ClientAgentCredentialsRepository>(ClientAgentCredentialsRepository);
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ClientAgentCredentialsRepository);
  });

  it('should provide ClientAgentCredentialsService', () => {
    const service = module.get<ClientAgentCredentialsService>(ClientAgentCredentialsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ClientAgentCredentialsService);
  });

  it('should export ClientAgentCredentialsService', () => {
    const service = module.get<ClientAgentCredentialsService>(ClientAgentCredentialsService);
    expect(service).toBeDefined();
  });

  it('should provide ClientAgentFileSystemProxyService', () => {
    const service = module.get<ClientAgentFileSystemProxyService>(ClientAgentFileSystemProxyService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ClientAgentFileSystemProxyService);
  });

  it('should export ClientAgentFileSystemProxyService', () => {
    const service = module.get<ClientAgentFileSystemProxyService>(ClientAgentFileSystemProxyService);
    expect(service).toBeDefined();
  });

  it('should provide SocketAuthService', () => {
    const service = module.get<SocketAuthService>(SocketAuthService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(SocketAuthService);
  });

  it('should provide SocketAuthService with optional Keycloak dependencies', () => {
    const service = module.get<SocketAuthService>(SocketAuthService);
    expect(service).toBeDefined();
    // SocketAuthService should be instantiated even if Keycloak is not configured
    expect(service).toBeInstanceOf(SocketAuthService);
  });

  describe('when authentication method is keycloak', () => {
    beforeEach(() => {
      // Ensure we're testing with keycloak auth method
      // Note: This test will only run if AUTHENTICATION_METHOD=keycloak in test environment
    });

    it('should provide KEYCLOAK_INSTANCE when auth method is keycloak', () => {
      const authMethod = getAuthenticationMethod();
      if (authMethod === 'keycloak') {
        const keycloakInstance = module.get(KEYCLOAK_INSTANCE);
        expect(keycloakInstance).toBeDefined();
        expect(keycloakInstance).toEqual(mockKeycloakInstance);
      }
    });

    it('should provide KEYCLOAK_CONNECT_OPTIONS when auth method is keycloak', () => {
      const authMethod = getAuthenticationMethod();
      if (authMethod === 'keycloak') {
        const keycloakOptions = module.get(KEYCLOAK_CONNECT_OPTIONS);
        expect(keycloakOptions).toBeDefined();
        expect(keycloakOptions).toEqual(mockKeycloakOptions);
      }
    });
  });
});
