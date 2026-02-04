import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { KeycloakUserSyncGuard } from './guards/keycloak-user-sync.guard';
import { UsersRepository } from './repositories/users.repository';

/**
 * Module that syncs Keycloak-authenticated users to the users table.
 * Only load when AUTHENTICATION_METHOD=keycloak.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersRepository, { provide: APP_GUARD, useClass: KeycloakUserSyncGuard }],
  exports: [UsersRepository],
})
export class KeycloakUserSyncModule {}
