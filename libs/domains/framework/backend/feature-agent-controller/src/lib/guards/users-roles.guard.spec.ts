import { getAuthenticationMethod } from '@forepath/identity/backend';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { UsersRolesGuard } from './users-roles.guard';

jest.mock('@forepath/identity/backend', () => ({
  getAuthenticationMethod: jest.fn(),
}));

describe('UsersRolesGuard', () => {
  let guard: UsersRolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new UsersRolesGuard(reflector);
    (getAuthenticationMethod as jest.Mock).mockReturnValue('users');
  });

  const createContext = (user: object): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('should allow public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(true);
  });

  it('should allow when no roles required', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'users.roles' ? (undefined as unknown as UserRole[]) : false));
    const result = guard.canActivate(createContext({ roles: ['user'] }));
    expect(result).toBe(true);
  });

  const mockReflectorForRoleCheck = () =>
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'users.roles' ? [UserRole.ADMIN] : false));

  it('should allow when user has required role', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({ roles: [UserRole.ADMIN, UserRole.USER] }));
    expect(result).toBe(true);
  });

  it('should deny when user lacks required role', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({ roles: [UserRole.USER] }));
    expect(result).toBe(false);
  });

  it('should deny when user has no roles', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(false);
  });

  it('should pass through when auth method is keycloak', () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('keycloak');
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'users.roles' ? [UserRole.ADMIN] : false));
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(true);
  });

  it('should pass through when auth method is api-key', () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('api-key');
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'users.roles' ? [UserRole.ADMIN] : false));
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(true);
  });
});
