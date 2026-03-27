import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@forepath/identity/backend';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const mockUsersRepository = {
    findByEmail: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findByIdOrThrow: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockEmailService = {
    send: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt-token'),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockUsersRepository as any,
      mockUsersService as any,
      mockEmailService as any,
      mockJwtService as any,
    );
  });

  it('rejects login when account is locked', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'locked@example.com',
      role: UserRole.USER,
      emailConfirmedAt: new Date('2026-01-01T00:00:00.000Z'),
      lockedAt: new Date('2026-01-02T00:00:00.000Z'),
      passwordHash: '$2b$12$hash',
    });

    await expect(service.login('locked@example.com', 'password123')).rejects.toThrow(UnauthorizedException);
    await expect(service.login('locked@example.com', 'password123')).rejects.toThrow(
      'This account is locked. Please contact an administrator.',
    );
  });

  it('returns token for unlocked confirmed user with valid password', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: 'active@example.com',
      role: UserRole.ADMIN,
      emailConfirmedAt: new Date('2026-01-01T00:00:00.000Z'),
      lockedAt: null,
      passwordHash: '$2b$12$hash',
    });
    mockUsersService.validatePassword.mockResolvedValue(true);

    const result = await service.login('active@example.com', 'password123');

    expect(mockUsersService.validatePassword).toHaveBeenCalledWith('password123', '$2b$12$hash');
    expect(mockJwtService.sign).toHaveBeenCalled();
    expect(result).toEqual({
      access_token: 'jwt-token',
      user: { id: 'user-2', email: 'active@example.com', role: UserRole.ADMIN },
    });
  });

  it('keeps invalid credentials response for non-existing user', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(null);

    await expect(service.login('missing@example.com', 'password123')).rejects.toThrow(UnauthorizedException);
    await expect(service.login('missing@example.com', 'password123')).rejects.toThrow('Invalid email or password');
    expect(mockUsersService.validatePassword).not.toHaveBeenCalled();
  });
});
