import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@forepath/identity/backend';
import { EmailService } from '@forepath/shared/backend';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { KeycloakRolesGuard } from '../guards/keycloak-roles.guard';
import { UsersAuthGuard } from '../guards/users-auth.guard';
import { UsersRolesGuard } from '../guards/users-roles.guard';
import { UsersRepository } from '../repositories/users.repository';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';

/**
 * Module for "users" authentication method.
 * Provides JWT-based auth with user registration, email confirmation, password reset.
 * Only load this module when AUTHENTICATION_METHOD=users.
 *
 * To enable statistics tracking, the consuming module should provide:
 * ```ts
 * { provide: IDENTITY_STATISTICS_SERVICE, useExisting: YourStatisticsService }
 * ```
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    UsersRepository,
    UsersService,
    EmailService,
    AuthService,
    UsersAuthGuard,
    KeycloakRolesGuard,
    UsersRolesGuard,
    { provide: APP_GUARD, useClass: UsersAuthGuard },
  ],
  exports: [UsersService, UsersRepository, AuthService],
})
export class UsersAuthModule {}
