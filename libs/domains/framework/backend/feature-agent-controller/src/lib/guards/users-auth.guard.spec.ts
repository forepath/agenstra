import { getAuthenticationMethod } from '@forepath/identity/backend';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersAuthGuard } from './users-auth.guard';

jest.mock('@forepath/identity/backend', () => ({
  getAuthenticationMethod: jest.fn(),
}));

describe('UsersAuthGuard', () => {
  let guard: UsersAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: Reflector;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    reflector = new Reflector();
    guard = new UsersAuthGuard(jwtService, reflector);
    (getAuthenticationMethod as jest.Mock).mockReturnValue('users');
  });

  const createContext = (request: object): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('should allow public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const request = { headers: {} };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw when no token and not public', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { headers: {} };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('should validate token and attach user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { headers: { authorization: 'Bearer valid-token' } };
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.com',
      roles: ['user'],
    });
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(request).toHaveProperty('user', {
      id: 'user-id',
      email: 'user@example.com',
      roles: ['user'],
    });
  });

  it('should throw when token is invalid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { headers: { authorization: 'Bearer invalid-token' } };
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('should skip when Keycloak is auth method', async () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('keycloak');
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { headers: {} };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should skip when api-key is auth method', async () => {
    (getAuthenticationMethod as jest.Mock).mockReturnValue('api-key');
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { headers: {} };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should pass through when user is already set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const request = { headers: {}, user: { id: 'existing', roles: ['admin'] } };
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });
});
