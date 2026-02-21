import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/auth/login.dto';
import { RegisterDto } from '../dto/auth/register.dto';
import { ConfirmEmailDto } from '../dto/auth/confirm-email.dto';
import { RequestPasswordResetDto } from '../dto/auth/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/auth/reset-password.dto';
import { ChangePasswordDto } from '../dto/auth/change-password.dto';
import { UsersAuthGuard } from '../guards/users-auth.guard';
import { UserRole } from '../entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockLoginResponse = {
    access_token: 'jwt-token-123',
    user: {
      id: 'user-uuid',
      email: 'test@example.com',
      role: UserRole.USER,
    },
  };

  const mockRegisterResponse = {
    user: {
      id: 'user-uuid',
      email: 'newuser@example.com',
      role: UserRole.USER,
    },
    message:
      'Account created. Please confirm your email before logging in. Check your inbox for the confirmation code.',
  };

  const mockFirstUserRegisterResponse = {
    user: {
      id: 'admin-uuid',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    },
    message: 'Account created successfully. You can log in immediately.',
  };

  const mockService = {
    login: jest.fn(),
    register: jest.fn(),
    confirmEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
    sign: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        UsersAuthGuard,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      service.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(result.access_token).toBe('jwt-token-123');
      expect(result.user.email).toBe('test@example.com');
      expect(service.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should login and return user with USER role', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'userpass123',
      };

      service.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result.user.role).toBe(UserRole.USER);
      expect(service.login).toHaveBeenCalledWith('user@example.com', 'userpass123');
    });

    it('should login and return user with ADMIN role', async () => {
      const loginDto: LoginDto = {
        email: 'admin@example.com',
        password: 'adminpass123',
      };

      const adminLoginResponse = {
        access_token: 'admin-jwt-token',
        user: {
          id: 'admin-uuid',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      };

      service.login.mockResolvedValue(adminLoginResponse);

      const result = await controller.login(loginDto);

      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(service.login).toHaveBeenCalledWith('admin@example.com', 'adminpass123');
    });

    it('should handle login with special characters in email', async () => {
      const loginDto: LoginDto = {
        email: 'user+test@example.com',
        password: 'password123',
      };

      service.login.mockResolvedValue({
        ...mockLoginResponse,
        user: { ...mockLoginResponse.user, email: 'user+test@example.com' },
      });

      const result = await controller.login(loginDto);

      expect(result.user.email).toBe('user+test@example.com');
      expect(service.login).toHaveBeenCalledWith('user+test@example.com', 'password123');
    });

    it('should handle login with long password', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'VeryLongPasswordWithManyCharacters123',
      };

      service.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(service.login).toHaveBeenCalledWith('test@example.com', 'VeryLongPasswordWithManyCharacters123');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'newpassword123',
      };

      service.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockRegisterResponse);
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.role).toBe(UserRole.USER);
      expect(result.message).toContain('confirm your email');
      expect(service.register).toHaveBeenCalledWith('newuser@example.com', 'newpassword123');
    });

    it('should register first user as admin', async () => {
      const registerDto: RegisterDto = {
        email: 'admin@example.com',
        password: 'adminpass123',
      };

      service.register.mockResolvedValue(mockFirstUserRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.message).toContain('You can log in immediately');
      expect(service.register).toHaveBeenCalledWith('admin@example.com', 'adminpass123');
    });

    it('should register user with minimum password length', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: '12345678',
      };

      service.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockRegisterResponse);
      expect(service.register).toHaveBeenCalledWith('test@example.com', '12345678');
    });

    it('should register user with complex password', async () => {
      const registerDto: RegisterDto = {
        email: 'secure@example.com',
        password: 'ComplexPassword123',
      };

      service.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockRegisterResponse);
      expect(service.register).toHaveBeenCalledWith('secure@example.com', 'ComplexPassword123');
    });

    it('should register user with special characters in email', async () => {
      const registerDto: RegisterDto = {
        email: 'user+tag@sub.example.com',
        password: 'password123',
      };

      service.register.mockResolvedValue({
        ...mockRegisterResponse,
        user: { ...mockRegisterResponse.user, email: 'user+tag@sub.example.com' },
      });

      const result = await controller.register(registerDto);

      expect(result.user.email).toBe('user+tag@sub.example.com');
      expect(service.register).toHaveBeenCalledWith('user+tag@sub.example.com', 'password123');
    });
  });

  describe('confirmEmail', () => {
    it('should successfully confirm email with valid code', async () => {
      const confirmDto: ConfirmEmailDto = {
        email: 'test@example.com',
        code: 'ABC123',
      };

      service.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully. You can now log in.',
      });

      const result = await controller.confirmEmail(confirmDto);

      expect(result.message).toContain('Email confirmed successfully');
      expect(service.confirmEmail).toHaveBeenCalledWith('test@example.com', 'ABC123');
    });

    it('should confirm email with uppercase code', async () => {
      const confirmDto: ConfirmEmailDto = {
        email: 'test@example.com',
        code: 'XYZ789',
      };

      service.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully. You can now log in.',
      });

      const result = await controller.confirmEmail(confirmDto);

      expect(result.message).toBe('Email confirmed successfully. You can now log in.');
      expect(service.confirmEmail).toHaveBeenCalledWith('test@example.com', 'XYZ789');
    });

    it('should confirm email with numeric code', async () => {
      const confirmDto: ConfirmEmailDto = {
        email: 'test@example.com',
        code: '123456',
      };

      service.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully. You can now log in.',
      });

      const result = await controller.confirmEmail(confirmDto);

      expect(result).toEqual({ message: 'Email confirmed successfully. You can now log in.' });
      expect(service.confirmEmail).toHaveBeenCalledWith('test@example.com', '123456');
    });

    it('should confirm email with alphanumeric code', async () => {
      const confirmDto: ConfirmEmailDto = {
        email: 'test@example.com',
        code: 'A1B2C3',
      };

      service.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully. You can now log in.',
      });

      const result = await controller.confirmEmail(confirmDto);

      expect(result).toEqual({ message: 'Email confirmed successfully. You can now log in.' });
      expect(service.confirmEmail).toHaveBeenCalledWith('test@example.com', 'A1B2C3');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset for existing user', async () => {
      const requestDto: RequestPasswordResetDto = {
        email: 'test@example.com',
      };

      service.requestPasswordReset.mockResolvedValue({
        message: 'If an account exists with this email, you will receive a password reset code.',
      });

      const result = await controller.requestPasswordReset(requestDto);

      expect(result.message).toContain('password reset code');
      expect(service.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should request password reset for non-existing user with same response', async () => {
      const requestDto: RequestPasswordResetDto = {
        email: 'nonexistent@example.com',
      };

      service.requestPasswordReset.mockResolvedValue({
        message: 'If an account exists with this email, you will receive a password reset code.',
      });

      const result = await controller.requestPasswordReset(requestDto);

      expect(result.message).toBe('If an account exists with this email, you will receive a password reset code.');
      expect(service.requestPasswordReset).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should handle request with special characters in email', async () => {
      const requestDto: RequestPasswordResetDto = {
        email: 'user+test@example.com',
      };

      service.requestPasswordReset.mockResolvedValue({
        message: 'If an account exists with this email, you will receive a password reset code.',
      });

      const result = await controller.requestPasswordReset(requestDto);

      expect(result).toEqual({
        message: 'If an account exists with this email, you will receive a password reset code.',
      });
      expect(service.requestPasswordReset).toHaveBeenCalledWith('user+test@example.com');
    });

    it('should handle multiple requests for same email', async () => {
      const requestDto: RequestPasswordResetDto = {
        email: 'test@example.com',
      };

      service.requestPasswordReset.mockResolvedValue({
        message: 'If an account exists with this email, you will receive a password reset code.',
      });

      const result1 = await controller.requestPasswordReset(requestDto);
      const result2 = await controller.requestPasswordReset(requestDto);

      expect(result1).toEqual(result2);
      expect(service.requestPasswordReset).toHaveBeenCalledTimes(2);
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid code', async () => {
      const resetDto: ResetPasswordDto = {
        email: 'test@example.com',
        code: 'ABC123',
        newPassword: 'newpassword123',
      };

      service.resetPassword.mockResolvedValue({
        message: 'Password reset successfully. You can now log in with your new password.',
      });

      const result = await controller.resetPassword(resetDto);

      expect(result.message).toContain('Password reset successfully');
      expect(service.resetPassword).toHaveBeenCalledWith('test@example.com', 'ABC123', 'newpassword123');
    });

    it('should reset password with minimum length password', async () => {
      const resetDto: ResetPasswordDto = {
        email: 'test@example.com',
        code: 'XYZ789',
        newPassword: '12345678',
      };

      service.resetPassword.mockResolvedValue({
        message: 'Password reset successfully. You can now log in with your new password.',
      });

      const result = await controller.resetPassword(resetDto);

      expect(result).toEqual({
        message: 'Password reset successfully. You can now log in with your new password.',
      });
      expect(service.resetPassword).toHaveBeenCalledWith('test@example.com', 'XYZ789', '12345678');
    });

    it('should reset password with complex password', async () => {
      const resetDto: ResetPasswordDto = {
        email: 'test@example.com',
        code: 'A1B2C3',
        newPassword: 'ComplexPassword456',
      };

      service.resetPassword.mockResolvedValue({
        message: 'Password reset successfully. You can now log in with your new password.',
      });

      const result = await controller.resetPassword(resetDto);

      expect(result.message).toBe('Password reset successfully. You can now log in with your new password.');
      expect(service.resetPassword).toHaveBeenCalledWith('test@example.com', 'A1B2C3', 'ComplexPassword456');
    });

    it('should reset password with numeric code', async () => {
      const resetDto: ResetPasswordDto = {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'newpassword789',
      };

      service.resetPassword.mockResolvedValue({
        message: 'Password reset successfully. You can now log in with your new password.',
      });

      const result = await controller.resetPassword(resetDto);

      expect(result).toEqual({
        message: 'Password reset successfully. You can now log in with your new password.',
      });
      expect(service.resetPassword).toHaveBeenCalledWith('test@example.com', '123456', 'newpassword789');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password with valid current password', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      };

      const mockReq = {
        user: { id: 'user-uuid' },
      } as any;

      service.changePassword.mockResolvedValue({
        message: 'Password changed successfully.',
      });

      const result = await controller.changePassword(changeDto, mockReq);

      expect(result.message).toBe('Password changed successfully.');
      expect(service.changePassword).toHaveBeenCalledWith(
        'user-uuid',
        'oldpassword123',
        'newpassword456',
        'newpassword456',
      );
    });

    it('should throw error when user is not authenticated', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      };

      const mockReq = {} as any;

      await expect(controller.changePassword(changeDto, mockReq)).rejects.toThrow(BadRequestException);
      await expect(controller.changePassword(changeDto, mockReq)).rejects.toThrow('User not authenticated');
    });

    it('should throw error when user.id is undefined', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      };

      const mockReq = {
        user: {},
      } as any;

      await expect(controller.changePassword(changeDto, mockReq)).rejects.toThrow(BadRequestException);
      await expect(controller.changePassword(changeDto, mockReq)).rejects.toThrow('User not authenticated');
    });

    it('should throw error when passwords do not match', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'differentpassword789',
      };

      const mockReq = {
        user: { id: 'user-uuid' },
      } as any;

      await expect(controller.changePassword(changeDto, mockReq)).rejects.toThrow(BadRequestException);
      await expect(controller.changePassword(changeDto, mockReq)).rejects.toThrow(
        'New password and confirmation do not match',
      );
    });

    it('should change password with minimum length password', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: '12345678',
        newPasswordConfirmation: '12345678',
      };

      const mockReq = {
        user: { id: 'user-uuid' },
      } as any;

      service.changePassword.mockResolvedValue({
        message: 'Password changed successfully.',
      });

      const result = await controller.changePassword(changeDto, mockReq);

      expect(result).toEqual({ message: 'Password changed successfully.' });
      expect(service.changePassword).toHaveBeenCalledWith('user-uuid', 'oldpassword123', '12345678', '12345678');
    });

    it('should change password with complex password', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: 'ComplexPassword789',
        newPasswordConfirmation: 'ComplexPassword789',
      };

      const mockReq = {
        user: { id: 'user-uuid' },
      } as any;

      service.changePassword.mockResolvedValue({
        message: 'Password changed successfully.',
      });

      const result = await controller.changePassword(changeDto, mockReq);

      expect(result.message).toBe('Password changed successfully.');
      expect(service.changePassword).toHaveBeenCalledWith(
        'user-uuid',
        'oldpassword123',
        'ComplexPassword789',
        'ComplexPassword789',
      );
    });

    it('should handle request with different user id', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      };

      const mockReq = {
        user: { id: 'different-user-uuid' },
      } as any;

      service.changePassword.mockResolvedValue({
        message: 'Password changed successfully.',
      });

      const result = await controller.changePassword(changeDto, mockReq);

      expect(result).toEqual({ message: 'Password changed successfully.' });
      expect(service.changePassword).toHaveBeenCalledWith(
        'different-user-uuid',
        'oldpassword123',
        'newpassword456',
        'newpassword456',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle login with empty JWT token response', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      service.login.mockResolvedValue({
        access_token: '',
        user: {
          id: 'user-uuid',
          email: 'test@example.com',
          role: UserRole.USER,
        },
      });

      const result = await controller.login(loginDto);

      expect(result.access_token).toBe('');
      expect(service.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle change password when new password same as current', async () => {
      const changeDto: ChangePasswordDto = {
        currentPassword: 'samepassword123',
        newPassword: 'samepassword123',
        newPasswordConfirmation: 'samepassword123',
      };

      const mockReq = {
        user: { id: 'user-uuid' },
      } as any;

      service.changePassword.mockResolvedValue({
        message: 'Password changed successfully.',
      });

      const result = await controller.changePassword(changeDto, mockReq);

      expect(result).toEqual({ message: 'Password changed successfully.' });
      expect(service.changePassword).toHaveBeenCalledWith(
        'user-uuid',
        'samepassword123',
        'samepassword123',
        'samepassword123',
      );
    });
  });

  describe('validation scenarios', () => {
    it('should handle login with mixed case email', async () => {
      const loginDto: LoginDto = {
        email: 'TeSt@ExAmPlE.CoM',
        password: 'password123',
      };

      service.login.mockResolvedValue({
        ...mockLoginResponse,
        user: { ...mockLoginResponse.user, email: 'TeSt@ExAmPlE.CoM' },
      });

      const result = await controller.login(loginDto);

      expect(result.user.email).toBe('TeSt@ExAmPlE.CoM');
      expect(service.login).toHaveBeenCalledWith('TeSt@ExAmPlE.CoM', 'password123');
    });

    it('should handle confirm email code with all numbers', async () => {
      const confirmDto: ConfirmEmailDto = {
        email: 'test@example.com',
        code: '000000',
      };

      service.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully. You can now log in.',
      });

      const result = await controller.confirmEmail(confirmDto);

      expect(result.message).toBe('Email confirmed successfully. You can now log in.');
      expect(service.confirmEmail).toHaveBeenCalledWith('test@example.com', '000000');
    });

    it('should handle confirm email code with all letters', async () => {
      const confirmDto: ConfirmEmailDto = {
        email: 'test@example.com',
        code: 'ABCDEF',
      };

      service.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully. You can now log in.',
      });

      const result = await controller.confirmEmail(confirmDto);

      expect(result).toEqual({ message: 'Email confirmed successfully. You can now log in.' });
      expect(service.confirmEmail).toHaveBeenCalledWith('test@example.com', 'ABCDEF');
    });
  });
});
