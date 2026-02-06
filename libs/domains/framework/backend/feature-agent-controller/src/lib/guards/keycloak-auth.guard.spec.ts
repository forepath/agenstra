import { getAuthenticationMethod } from '@forepath/identity/backend';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { KeycloakAuthGuard } from './keycloak-auth.guard';

jest.mock('@forepath/identity/backend', () => ({
  getAuthenticationMethod: jest.fn(),
}));

describe('KeycloakAuthGuard', () => {
  let guard: KeycloakAuthGuard;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findByKeycloakSub' | 'findByEmail' | 'count' | 'create' | 'update'>
  >;
  let reflector: Reflector;

  beforeEach(() => {
    usersRepository = {
      findByKeycloakSub: jest.fn(),
      findByEmail: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    reflector = new Reflector();
    guard = new KeycloakAuthGuard(usersRepository as unknown as UsersRepository, reflector);
    (getAuthenticationMethod as jest.Mock).mockReturnValue('keycloak');
  });

  const createContext = (request: object): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('should allow public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const request = { user: { sub: 'keycloak-sub', email: 'test@example.com' } };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(usersRepository.findByKeycloakSub).not.toHaveBeenCalled();
  });

  it('should skip when users is auth method', async () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('users');
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub', email: 'test@example.com' } };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(usersRepository.findByKeycloakSub).not.toHaveBeenCalled();
  });

  it('should skip when api-key is auth method', async () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('api-key');
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub', email: 'test@example.com' } };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(usersRepository.findByKeycloakSub).not.toHaveBeenCalled();
  });

  it('should pass through when no token payload', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: undefined };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(usersRepository.findByKeycloakSub).not.toHaveBeenCalled();
  });

  it('should pass through when token has no sub', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { email: 'test@example.com' } };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(usersRepository.findByKeycloakSub).not.toHaveBeenCalled();
  });

  it('should sync existing user by keycloakSub and attach to request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-123', email: 'user@example.com' } };
    const existingUser = {
      id: 'user-uuid',
      email: 'user@example.com',
      role: UserRole.ADMIN,
    } as { id: string; email: string; role: UserRole };
    usersRepository.findByKeycloakSub.mockResolvedValue(existingUser as never);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'user-uuid',
      username: 'user@example.com',
      roles: ['admin'],
    });
    expect(usersRepository.findByKeycloakSub).toHaveBeenCalledWith('keycloak-sub-123');
    expect(usersRepository.findByEmail).not.toHaveBeenCalled();
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('should sync existing user by email and link keycloakSub', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-456', email: 'existing@example.com' } };
    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(5);
    const existingUser = {
      id: 'existing-uuid',
      email: 'existing@example.com',
      role: UserRole.USER,
    } as { id: string; email: string; role: UserRole };
    usersRepository.findByEmail.mockResolvedValue(existingUser as never);
    usersRepository.update.mockResolvedValue({ ...existingUser, keycloakSub: 'keycloak-sub-456' } as never);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'existing-uuid',
      username: 'existing@example.com',
      roles: ['user'],
    });
    expect(usersRepository.findByKeycloakSub).toHaveBeenCalledWith('keycloak-sub-456');
    expect(usersRepository.findByEmail).toHaveBeenCalledWith('existing@example.com');
    expect(usersRepository.update).toHaveBeenCalledWith('existing-uuid', { keycloakSub: 'keycloak-sub-456' });
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('should create new user with admin role when first user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-789', email: 'new@example.com' } };
    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(0);
    usersRepository.findByEmail.mockResolvedValue(null);
    const createdUser = {
      id: 'new-uuid',
      email: 'new@example.com',
      role: UserRole.ADMIN,
    } as { id: string; email: string; role: UserRole };
    usersRepository.create.mockResolvedValue(createdUser as never);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'new-uuid',
      username: 'new@example.com',
      roles: ['admin'],
    });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        keycloakSub: 'keycloak-sub-789',
        role: UserRole.ADMIN,
      }),
    );
  });

  it('should create new user with user role when not first user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-999', email: 'second@example.com' } };
    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(1);
    usersRepository.findByEmail.mockResolvedValue(null);
    const createdUser = {
      id: 'second-uuid',
      email: 'second@example.com',
      role: UserRole.USER,
    } as { id: string; email: string; role: UserRole };
    usersRepository.create.mockResolvedValue(createdUser as never);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'second-uuid',
      username: 'second@example.com',
      roles: ['user'],
    });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'second@example.com',
        keycloakSub: 'keycloak-sub-999',
        role: UserRole.USER,
      }),
    );
  });

  it('should use preferred_username when email is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-111', preferred_username: 'johndoe' } };
    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(0);
    usersRepository.findByEmail.mockResolvedValue(null);
    const createdUser = {
      id: 'created-uuid',
      email: 'johndoe',
      role: UserRole.ADMIN,
    } as { id: string; email: string; role: UserRole };
    usersRepository.create.mockResolvedValue(createdUser as never);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(usersRepository.findByEmail).toHaveBeenCalledWith('johndoe');
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'johndoe',
      }),
    );
  });

  it('should use sub@keycloak when email and preferred_username are missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-222' } };
    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(0);
    usersRepository.findByEmail.mockResolvedValue(null);
    const createdUser = {
      id: 'created-uuid',
      email: 'keycloak-sub-222@keycloak',
      role: UserRole.ADMIN,
    } as { id: string; email: string; role: UserRole };
    usersRepository.create.mockResolvedValue(createdUser as never);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(usersRepository.findByEmail).toHaveBeenCalledWith('keycloak-sub-222@keycloak');
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'keycloak-sub-222@keycloak',
      }),
    );
  });

  it('should lowercase email when creating user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { user: { sub: 'keycloak-sub-333', email: 'MixedCase@Example.com' } };
    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(0);
    usersRepository.findByEmail.mockResolvedValue(null);
    const createdUser = {
      id: 'created-uuid',
      email: 'mixedcase@example.com',
      role: UserRole.ADMIN,
    } as { id: string; email: string; role: UserRole };
    usersRepository.create.mockResolvedValue(createdUser as never);

    await guard.canActivate(createContext(request));

    expect(usersRepository.findByEmail).toHaveBeenCalledWith('mixedcase@example.com');
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'mixedcase@example.com',
      }),
    );
  });
});
