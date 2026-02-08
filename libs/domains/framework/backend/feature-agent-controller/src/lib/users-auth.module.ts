import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controllers/auth.controller';
import { StatisticsModule } from './statistics.module';
import { UsersController } from './controllers/users.controller';
import { UserEntity } from './entities/user.entity';
import { UsersAuthGuard } from './guards/users-auth.guard';
import { KeycloakRolesGuard } from './guards/keycloak-roles.guard';
import { UsersRolesGuard } from './guards/users-roles.guard';
import { UsersRepository } from './repositories/users.repository';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { UsersService } from './services/users.service';
/**
 * Module for "users" authentication method.
 * Provides JWT-based auth with user registration, email confirmation, password reset.
 * Only load this module when AUTHENTICATION_METHOD=users.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    StatisticsModule,
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
