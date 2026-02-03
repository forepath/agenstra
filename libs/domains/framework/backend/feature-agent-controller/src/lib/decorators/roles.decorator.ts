import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Specifies which roles can access a route.
 * If not specified, all authenticated users (all roles) can access.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
