import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const KEYCLOAK_ROLES_KEY = 'keycloak.roles';

/**
 * Decorator for Keycloak token role checking.
 * Sets the required roles as metadata. The KeycloakRolesGuard reads this metadata
 * and checks roles from realm_access.roles, resource_access.<client>.roles,
 * and user.roles when set by KeycloakAuthGuard.
 *
 * Usage: Apply alongside UseGuards(KeycloakRolesGuard) or use the composed decorator
 * from the identity feature-auth library.
 */
export const KeycloakRoles = (...roles: UserRole[]) => SetMetadata(KEYCLOAK_ROLES_KEY, roles);
