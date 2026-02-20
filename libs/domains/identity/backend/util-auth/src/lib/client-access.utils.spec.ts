import { ForbiddenException } from '@nestjs/common';
import { checkClientAccess, ensureClientAccess, getUserFromRequest, type RequestWithUser } from './client-access.utils';
import { ClientUserRole } from './entities/client-user.entity';
import { UserRole } from './entities/user.entity';

describe('client-access.utils', () => {
  const mockClientsRepository = {
    findById: jest.fn(),
  };

  const mockClientUsersRepository = {
    findUserClientAccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserFromRequest', () => {
    it('should return isApiKeyAuth when apiKeyAuthenticated is true', () => {
      const req = { apiKeyAuthenticated: true } as RequestWithUser;
      const result = getUserFromRequest(req);
      expect(result).toEqual({ isApiKeyAuth: true });
    });

    it('should return userId and userRole when user is present', () => {
      const req = {
        apiKeyAuthenticated: false,
        user: { id: 'user-1', email: 'test@example.com', roles: ['user'] },
      } as RequestWithUser;
      const result = getUserFromRequest(req);
      expect(result).toEqual({
        userId: 'user-1',
        userRole: UserRole.USER,
        isApiKeyAuth: false,
      });
    });

    it('should return ADMIN role when user has admin in roles', () => {
      const req = {
        apiKeyAuthenticated: false,
        user: { id: 'user-1', roles: ['admin'] },
      } as RequestWithUser;
      const result = getUserFromRequest(req);
      expect(result.userRole).toBe(UserRole.ADMIN);
    });

    it('should return isApiKeyAuth false when no user', () => {
      const req = {} as RequestWithUser;
      const result = getUserFromRequest(req);
      expect(result).toEqual({ isApiKeyAuth: false });
    });
  });

  describe('checkClientAccess', () => {
    it('should grant access for API key auth', async () => {
      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        undefined,
        undefined,
        true,
      );
      expect(result).toEqual({ hasAccess: true, isClientCreator: false });
      expect(mockClientsRepository.findById).not.toHaveBeenCalled();
    });

    it('should deny access when no userId or userRole', async () => {
      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        undefined,
        undefined,
        false,
      );
      expect(result).toEqual({ hasAccess: false, isClientCreator: false });
    });

    it('should grant access for global admin', async () => {
      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        'user-1',
        UserRole.ADMIN,
        false,
      );
      expect(result).toEqual({ hasAccess: true, isClientCreator: false });
      expect(mockClientsRepository.findById).not.toHaveBeenCalled();
    });

    it('should grant access when user is client creator', async () => {
      mockClientsRepository.findById.mockResolvedValue({ id: 'client-1', userId: 'user-1' });
      mockClientUsersRepository.findUserClientAccess.mockResolvedValue(null);

      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        'user-1',
        UserRole.USER,
        false,
      );
      expect(result).toEqual({ hasAccess: true, isClientCreator: true });
    });

    it('should grant access when user has client_user relationship', async () => {
      mockClientsRepository.findById.mockResolvedValue({ id: 'client-1', userId: 'other-user' });
      mockClientUsersRepository.findUserClientAccess.mockResolvedValue({
        userId: 'user-1',
        clientId: 'client-1',
        role: ClientUserRole.USER,
      });

      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        'user-1',
        UserRole.USER,
        false,
      );
      expect(result).toEqual({
        hasAccess: true,
        isClientCreator: false,
        clientUserRole: ClientUserRole.USER,
      });
    });

    it('should deny access when user has no relationship', async () => {
      mockClientsRepository.findById.mockResolvedValue({ id: 'client-1', userId: 'other-user' });
      mockClientUsersRepository.findUserClientAccess.mockResolvedValue(null);

      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        'user-1',
        UserRole.USER,
        false,
      );
      expect(result).toEqual({ hasAccess: false, isClientCreator: false });
    });

    it('should deny access when client not found', async () => {
      mockClientsRepository.findById.mockResolvedValue(null);

      const result = await checkClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        'user-1',
        UserRole.USER,
        false,
      );
      expect(result).toEqual({ hasAccess: false, isClientCreator: false });
    });
  });

  describe('ensureClientAccess', () => {
    it('should not throw when access is granted', async () => {
      mockClientsRepository.findById.mockResolvedValue({ id: 'client-1', userId: 'user-1' });
      mockClientUsersRepository.findUserClientAccess.mockResolvedValue(null);

      const req = { apiKeyAuthenticated: true } as RequestWithUser;
      const result = await ensureClientAccess(
        mockClientsRepository as any,
        mockClientUsersRepository as any,
        'client-1',
        req,
      );
      expect(result).toEqual({ isClientCreator: false });
    });

    it('should throw ForbiddenException when access is denied', async () => {
      mockClientsRepository.findById.mockResolvedValue({ id: 'client-1', userId: 'other-user' });
      mockClientUsersRepository.findUserClientAccess.mockResolvedValue(null);

      const req = { apiKeyAuthenticated: false, user: { id: 'user-1', roles: ['user'] } } as RequestWithUser;

      await expect(
        ensureClientAccess(mockClientsRepository as any, mockClientUsersRepository as any, 'client-1', req),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
