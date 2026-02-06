import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { UsersRolesGuard } from '../guards/users-roles.guard';

export const USERS_ROLES_KEY = 'users.roles';

/**
 * Decorator for app-level role checking (users table / JWT payload).
 * Use on routes that require specific roles when "users" auth method is active.
 * Replaces the former RolesGuard + @Roles pattern.
 */
export const UsersRoles = (...roles: UserRole[]) =>
  applyDecorators(SetMetadata(USERS_ROLES_KEY, roles), UseGuards(UsersRolesGuard));
