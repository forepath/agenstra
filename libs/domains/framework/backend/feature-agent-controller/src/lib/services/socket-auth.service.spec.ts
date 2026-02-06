import { getAuthenticationMethod } from '@forepath/identity/backend';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { KEYCLOAK_CONNECT_OPTIONS, KEYCLOAK_INSTANCE, TokenValidation } from 'nest-keycloak-connect';
import { UserRole } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { SocketAuthService } from './socket-auth.service';

jest.mock('@forepath/identity/backend', () => ({
  getAuthenticationMethod: jest.fn(),
}));

function createJwtPayload(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function createToken(payload: object): string {
  const header = createJwtPayload({ alg: 'HS256', typ: 'JWT' });
  const payloadB64 = createJwtPayload(payload);
  return `${header}.${payloadB64}.signature`;
}

describe('SocketAuthService', () => {
  let service: SocketAuthService;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'findByKeycloakSub'>>;
  let mockKeycloakInstance: {
    grantManager: {
      createGrant: jest.Mock;
      validateAccessToken: jest.Mock;
      validateToken: jest.Mock;
    };
  };
  let mockKeycloakOptions: { tokenValidation?: TokenValidation };
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;

  beforeEach(async () => {
    usersRepository = {
      findByKeycloakSub: jest.fn(),
    };

    mockKeycloakInstance = {
      grantManager: {
        createGrant: jest.fn(),
        validateAccessToken: jest.fn(),
        validateToken: jest.fn(),
      },
    };

    mockKeycloakOptions = { tokenValidation: TokenValidation.ONLINE };

    jwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketAuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: KEYCLOAK_INSTANCE, useValue: mockKeycloakInstance },
        { provide: KEYCLOAK_CONNECT_OPTIONS, useValue: mockKeycloakOptions },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<SocketAuthService>(SocketAuthService);
    (getAuthenticationMethod as jest.Mock).mockReturnValue('keycloak');
  });

  describe('validateAndGetUser', () => {
    it('should return null when no auth header', async () => {
      const result = await service.validateAndGetUser(undefined);
      expect(result).toBeNull();
    });

    it('should return null when auth header is empty', async () => {
      const result = await service.validateAndGetUser('');
      expect(result).toBeNull();
    });

    it('should return null when Bearer token is malformed', async () => {
      const result = await service.validateAndGetUser('Bearer');
      expect(result).toBeNull();
    });

    it('should return null when scheme is not Bearer', async () => {
      const result = await service.validateAndGetUser('Basic dXNlcjpwYXNz');
      expect(result).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      (getAuthenticationMethod as jest.Mock).mockReturnValue('api-key');
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return user info when valid API key (Bearer scheme)', async () => {
      process.env.STATIC_API_KEY = 'test-api-key';
      const result = await service.validateAndGetUser('Bearer test-api-key');
      expect(result).toEqual({
        isApiKeyAuth: true,
        user: { id: 'api-key-user', roles: ['admin', 'user'] },
      });
    });

    it('should return user info when valid API key (ApiKey scheme)', async () => {
      process.env.STATIC_API_KEY = 'test-api-key';
      const result = await service.validateAndGetUser('ApiKey test-api-key');
      expect(result).toEqual({
        isApiKeyAuth: true,
        user: { id: 'api-key-user', roles: ['admin', 'user'] },
      });
    });

    it('should return null when API key is wrong', async () => {
      process.env.STATIC_API_KEY = 'correct-key';
      const result = await service.validateAndGetUser('Bearer wrong-key');
      expect(result).toBeNull();
    });

    it('should return null when STATIC_API_KEY is not set', async () => {
      delete process.env.STATIC_API_KEY;
      const result = await service.validateAndGetUser('Bearer any-key');
      expect(result).toBeNull();
    });
  });

  describe('validateKeycloakToken', () => {
    it('should return null when createGrant fails', async () => {
      mockKeycloakInstance.grantManager.createGrant.mockRejectedValue(new Error('Invalid token'));
      const token = createToken({ sub: 'keycloak-sub-123', realm_access: { roles: ['user'] } });

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result).toBeNull();
    });

    it('should return null when validateAccessToken rejects token', async () => {
      const token = createToken({ sub: 'keycloak-sub-123', realm_access: { roles: ['user'] } });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateAccessToken.mockResolvedValue(false);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result).toBeNull();
    });

    it('should return null when token has no sub', async () => {
      const token = createToken({ realm_access: { roles: ['user'] } });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateAccessToken.mockResolvedValue(token);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result).toBeNull();
    });

    it('should resolve Keycloak sub to users table id when synced user exists', async () => {
      const keycloakSub = '82d715f3-4ccb-4bca-8137-31ac005a7277';
      const usersTableId = 'b022ee55-4b4f-47ba-accd-04082b959add';
      const token = createToken({
        sub: keycloakSub,
        realm_access: { roles: ['user'] },
      });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateAccessToken.mockResolvedValue(token);
      usersRepository.findByKeycloakSub.mockResolvedValue({
        id: usersTableId,
        keycloakSub,
        email: 'user@example.com',
        role: UserRole.USER,
      } as never);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(usersTableId);
      expect(result!.user.id).toBe(usersTableId);
      expect(result!.userRole).toBe(UserRole.USER);
      expect(usersRepository.findByKeycloakSub).toHaveBeenCalledWith(keycloakSub);
    });

    it('should use Keycloak sub as userId when synced user does not exist', async () => {
      const keycloakSub = '82d715f3-4ccb-4bca-8137-31ac005a7277';
      const token = createToken({
        sub: keycloakSub,
        realm_access: { roles: ['user'] },
      });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateAccessToken.mockResolvedValue(token);
      usersRepository.findByKeycloakSub.mockResolvedValue(null);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(keycloakSub);
      expect(result!.user.id).toBe(keycloakSub);
      expect(usersRepository.findByKeycloakSub).toHaveBeenCalledWith(keycloakSub);
    });

    it('should set UserRole.ADMIN when realm_access includes admin', async () => {
      const keycloakSub = 'admin-sub';
      const usersTableId = 'admin-uuid';
      const token = createToken({
        sub: keycloakSub,
        realm_access: { roles: ['admin', 'user'] },
      });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateAccessToken.mockResolvedValue(token);
      usersRepository.findByKeycloakSub.mockResolvedValue({
        id: usersTableId,
        keycloakSub,
        role: UserRole.ADMIN,
      } as never);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result!.userRole).toBe(UserRole.ADMIN);
      expect(result!.user.roles).toContain('admin');
    });

    it('should set UserRole.ADMIN when realm_access includes realm-admin', async () => {
      const token = createToken({
        sub: 'realm-admin-sub',
        realm_access: { roles: ['realm-admin'] },
      });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateAccessToken.mockResolvedValue(token);
      usersRepository.findByKeycloakSub.mockResolvedValue(null);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result!.userRole).toBe(UserRole.ADMIN);
    });

    it('should use OFFLINE validation when configured', async () => {
      mockKeycloakOptions.tokenValidation = TokenValidation.OFFLINE;
      const token = createToken({ sub: 'sub-123', realm_access: { roles: [] } });
      const grant = { access_token: token };
      mockKeycloakInstance.grantManager.createGrant.mockResolvedValue(grant);
      mockKeycloakInstance.grantManager.validateToken.mockResolvedValue(token);
      usersRepository.findByKeycloakSub.mockResolvedValue(null);

      const result = await service.validateAndGetUser(`Bearer ${token}`);

      expect(result).not.toBeNull();
      expect(mockKeycloakInstance.grantManager.validateToken).toHaveBeenCalledWith(token, 'Bearer');
    });
  });

  describe('validateUsersToken', () => {
    beforeEach(() => {
      (getAuthenticationMethod as jest.Mock).mockReturnValue('users');
    });

    it('should return user info when valid JWT', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
      });
      const result = await service.validateAndGetUser('Bearer valid-jwt');

      expect(result).toEqual({
        userId: 'user-123',
        userRole: UserRole.USER,
        isApiKeyAuth: false,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          roles: ['user'],
        },
      });
    });

    it('should return ADMIN when roles includes admin', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'admin-123',
        roles: ['admin'],
      });
      const result = await service.validateAndGetUser('Bearer valid-jwt');

      expect(result!.userRole).toBe(UserRole.ADMIN);
    });

    it('should return null when JWT is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      const result = await service.validateAndGetUser('Bearer invalid-jwt');

      expect(result).toBeNull();
    });

    it('should default to user role when roles is missing', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      const result = await service.validateAndGetUser('Bearer valid-jwt');

      expect(result!.userRole).toBe(UserRole.USER);
      expect(result!.user.roles).toEqual(['user']);
    });
  });

  describe('auth method routing', () => {
    it('should return null when keycloak auth but keycloak instance is null', async () => {
      const moduleWithoutKeycloak = await Test.createTestingModule({
        providers: [
          SocketAuthService,
          { provide: UsersRepository, useValue: usersRepository },
          { provide: KEYCLOAK_INSTANCE, useValue: null },
          { provide: KEYCLOAK_CONNECT_OPTIONS, useValue: null },
          { provide: JwtService, useValue: null },
        ],
      }).compile();
      const svc = moduleWithoutKeycloak.get<SocketAuthService>(SocketAuthService);
      (getAuthenticationMethod as jest.Mock).mockReturnValue('keycloak');

      const result = await svc.validateAndGetUser('Bearer some-token');
      expect(result).toBeNull();
    });

    it('should return null when users auth but jwtService is null', async () => {
      const moduleWithoutJwt = await Test.createTestingModule({
        providers: [
          SocketAuthService,
          { provide: UsersRepository, useValue: usersRepository },
          { provide: KEYCLOAK_INSTANCE, useValue: null },
          { provide: KEYCLOAK_CONNECT_OPTIONS, useValue: null },
          { provide: JwtService, useValue: null },
        ],
      }).compile();
      const svc = moduleWithoutJwt.get<SocketAuthService>(SocketAuthService);
      (getAuthenticationMethod as jest.Mock).mockReturnValue('users');

      const result = await svc.validateAndGetUser('Bearer some-token');
      expect(result).toBeNull();
    });
  });
});
