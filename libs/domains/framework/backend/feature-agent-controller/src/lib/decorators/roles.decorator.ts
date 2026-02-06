import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

/**
 * Unique key to avoid conflict with nest-keycloak-connect's RoleGuard (which uses 'roles').
 * Our RolesGuard checks app-level roles (users table); Keycloak RoleGuard checks token roles.
 */
export const ROLES_KEY = 'app.roles';

/**
 * Specifies which roles can access a route.
 * If not specified, all authenticated users (all roles) can access.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
