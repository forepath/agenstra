import { UserRole } from '@forepath/identity/backend';
import { Reflector } from '@nestjs/core';

import { UsersRepository } from '../repositories/users.repository';

import { KeycloakAuthGuard } from './keycloak-auth.guard';

describe('KeycloakAuthGuard', () => {
  let guard: KeycloakAuthGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findByKeycloakSub' | 'count' | 'findByEmail' | 'create' | 'update'>
  >;
  let originalAuthMethod: string | undefined;
  const createExecutionContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as Parameters<KeycloakAuthGuard['canActivate']>[0];

  beforeEach(() => {
    originalAuthMethod = process.env.AUTHENTICATION_METHOD;
    process.env.AUTHENTICATION_METHOD = 'keycloak';

    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    usersRepository = {
      findByKeycloakSub: jest.fn(),
      count: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    guard = new KeycloakAuthGuard(usersRepository as unknown as UsersRepository, reflector as unknown as Reflector);
  });

  afterEach(() => {
    if (originalAuthMethod !== undefined) {
      process.env.AUTHENTICATION_METHOD = originalAuthMethod;
    } else {
      delete process.env.AUTHENTICATION_METHOD;
    }

    jest.clearAllMocks();
  });

  it('allows request when synced user is not locked', async () => {
    const request = { user: { sub: 'kc-sub-1', email: 'a@b.com' } };

    usersRepository.findByKeycloakSub.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      role: UserRole.USER,
      lockedAt: null,
    } as never);

    const ok = await guard.canActivate(createExecutionContext(request));

    expect(ok).toBe(true);
    expect(request['user']).toEqual({
      id: 'user-1',
      username: 'a@b.com',
      roles: [UserRole.USER],
    });
  });

  it('rejects when synced user is locked', async () => {
    const request = { user: { sub: 'kc-sub-1', email: 'a@b.com' } };

    usersRepository.findByKeycloakSub.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      role: UserRole.USER,
      lockedAt: new Date(),
    } as never);

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toThrow(
      'This account is locked. Please contact an administrator.',
    );
  });

  it('rejects when matching email user is locked before linking keycloak sub', async () => {
    const request = { user: { sub: 'kc-new', email: 'existing@b.com' } };

    usersRepository.findByKeycloakSub.mockResolvedValue(null);
    usersRepository.count.mockResolvedValue(1);
    usersRepository.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: 'existing@b.com',
      role: UserRole.USER,
      lockedAt: new Date(),
    } as never);

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toThrow(
      'This account is locked. Please contact an administrator.',
    );
    expect(usersRepository.update).not.toHaveBeenCalled();
  });
});
