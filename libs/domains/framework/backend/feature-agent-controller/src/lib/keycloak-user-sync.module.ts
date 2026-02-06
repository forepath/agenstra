import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { KeycloakUserSyncGuard } from './guards/keycloak-user-sync.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersRepository } from './repositories/users.repository';
import { EmailService } from './services/email.service';
import { UsersService } from './services/users.service';

/**
 * Module that syncs Keycloak-authenticated users to the users table.
 * Provides UsersController for user management when Keycloak is active.
 * Only load when AUTHENTICATION_METHOD=keycloak.
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
  controllers: [UsersController],
  providers: [
    UsersRepository,
    UsersService,
    EmailService,
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: KeycloakUserSyncGuard },
  ],
  exports: [UsersRepository],
})
export class KeycloakUserSyncModule {}
