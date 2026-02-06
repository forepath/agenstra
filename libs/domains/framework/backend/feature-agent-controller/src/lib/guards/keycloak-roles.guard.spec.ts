import { getAuthenticationMethod } from '@forepath/identity/backend';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { KeycloakRolesGuard } from './keycloak-roles.guard';

jest.mock('@forepath/identity/backend', () => ({
  getAuthenticationMethod: jest.fn(),
}));

describe('KeycloakRolesGuard', () => {
  let guard: KeycloakRolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new KeycloakRolesGuard(reflector);
    (getAuthenticationMethod as jest.Mock).mockReturnValue('keycloak');
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
      .mockImplementation((key: string) => (key === 'keycloak.roles' ? (undefined as unknown as UserRole[]) : false));
    const result = guard.canActivate(createContext({ roles: ['user'] }));
    expect(result).toBe(true);
  });

  const mockReflectorForRoleCheck = () =>
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'keycloak.roles' ? [UserRole.ADMIN] : false));

  it('should allow when user has required role in user.roles', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({ roles: [UserRole.ADMIN, UserRole.USER] }));
    expect(result).toBe(true);
  });

  it('should allow when roles come from Keycloak realm_access', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(
      createContext({ realm_access: { roles: ['admin', 'user'] }, resource_access: {} }),
    );
    expect(result).toBe(true);
  });

  it('should allow when roles come from Keycloak resource_access', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(
      createContext({
        resource_access: {
          'agent-controller': { roles: ['admin'] },
          account: { roles: ['manage-account'] },
        },
      }),
    );
    expect(result).toBe(true);
  });

  it('should deny when user lacks required role', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({ roles: [UserRole.USER] }));
    expect(result).toBe(false);
  });

  it('should deny when Keycloak token has no admin role', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({ realm_access: { roles: ['user'] }, resource_access: {} }));
    expect(result).toBe(false);
  });

  it('should deny when user has no roles', () => {
    mockReflectorForRoleCheck();
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(false);
  });

  it('should pass through when auth method is users', () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('users');
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'keycloak.roles' ? [UserRole.ADMIN] : false));
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(true);
  });

  it('should pass through when auth method is api-key', () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('api-key');
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => (key === 'keycloak.roles' ? [UserRole.ADMIN] : false));
    const result = guard.canActivate(createContext({}));
    expect(result).toBe(true);
  });
});
