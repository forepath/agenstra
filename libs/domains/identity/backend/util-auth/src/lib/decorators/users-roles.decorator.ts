import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const USERS_ROLES_KEY = 'users.roles';

/**
 * Decorator for app-level role checking (users table / JWT payload).
 * Sets the required roles as metadata. The UsersRolesGuard reads this metadata
 * and checks the user's role.
 *
 * Usage: Apply alongside UseGuards(UsersRolesGuard) or use the composed decorator
 * from the identity feature-auth library.
 */
export const UsersRoles = (...roles: UserRole[]) => SetMetadata(USERS_ROLES_KEY, roles);
