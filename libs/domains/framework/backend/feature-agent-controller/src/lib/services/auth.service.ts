import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { createTokenWithUserId, validateTokenAgainstHash } from '../utils/token.utils';
import { EmailService } from './email.service';
import { UsersService } from './users.service';

const JWT_EXPIRES_IN = '7d';
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface LoginResponse {
  access_token: string;
  user: { id: string; email: string; role: UserRole };
}

export interface RegisterResponse {
  user: { id: string; email: string; role: UserRole };
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailConfirmedAt) {
      throw new UnauthorizedException('Email not confirmed. Please confirm your email before logging in.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses external authentication (Keycloak).');
    }

    const valid = await this.usersService.validatePassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user);
    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async register(email: string, password: string): Promise<RegisterResponse> {
    const count = await this.usersRepository.count();
    const isFirstUser = count === 0;

    const created = await this.usersService.create(
      { email, password, role: isFirstUser ? UserRole.ADMIN : UserRole.USER },
      isFirstUser,
    );

    if (isFirstUser) {
      return {
        user: { id: created.id, email: created.email, role: created.role },
        message: 'Account created successfully. You can log in immediately.',
      };
    }

    const { token, hash } = createTokenWithUserId(created.id);
    const tokenHash = await hash;
    await this.usersRepository.update(created.id, { emailConfirmationToken: tokenHash });
    await this.emailService.sendConfirmationEmail(created.email, token);

    return {
      user: { id: created.id, email: created.email, role: created.role },
      message:
        'Account created. Please confirm your email before logging in. Check your inbox for the confirmation code.',
    };
  }

  async confirmEmail(token: string): Promise<{ message: string }> {
    const userId = this.parseUserIdFromToken(token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user?.emailConfirmationToken) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    const valid = await validateTokenAgainstHash(token, user.emailConfirmationToken);
    if (!valid) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    await this.usersRepository.update(user.id, {
      emailConfirmedAt: new Date(),
      emailConfirmationToken: undefined,
    });

    return { message: 'Email confirmed successfully. You can now log in.' };
  }

  private parseUserIdFromToken(token: string): string | null {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0]) return null;
    try {
      const userId = Buffer.from(parts[0], 'base64url').toString('utf8');
      return userId || null;
    } catch {
      return null;
    }
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      return {
        message: 'If an account exists with this email, you will receive a password reset link.',
      };
    }

    const { token, hash } = createTokenWithUserId(user.id);
    const tokenHash = await hash;
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

    await this.usersRepository.update(user.id, {
      passwordResetToken: tokenHash,
      passwordResetTokenExpiresAt: expiresAt,
    });

    await this.emailService.send({
      to: user.email,
      subject: 'Reset your password',
      text: `You requested a password reset. Use the following code to reset your password:\n\n${token}\n\nEnter this code on the reset password page. This code expires in 1 hour.`,
      html: `<p>You requested a password reset. Use the following code to reset your password:</p><p><strong>${token}</strong></p><p>Enter this code on the reset password page. This code expires in 1 hour.</p>`,
    });

    return {
      message: 'If an account exists with this email, you will receive a password reset code.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const userId = this.parseUserIdFromToken(token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user?.passwordResetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const valid = await validateTokenAgainstHash(token, user.passwordResetToken);
    if (!valid) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(user.id, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetTokenExpiresAt: undefined,
    });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<{ message: string }> {
    if (newPassword !== newPasswordConfirmation) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.usersRepository.findByIdOrThrow(userId);
    if (!user.passwordHash) {
      throw new BadRequestException('This account uses external authentication. Cannot change password here.');
    }

    const valid = await this.usersService.validatePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(userId, { passwordHash });

    return { message: 'Password changed successfully.' };
  }

  private generateToken(user: UserEntity): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        roles: [user.role],
      },
      { expiresIn: JWT_EXPIRES_IN },
    );
  }
}
