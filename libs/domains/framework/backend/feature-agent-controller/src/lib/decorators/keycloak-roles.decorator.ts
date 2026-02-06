import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { KeycloakRolesGuard } from '../guards/keycloak-roles.guard';

export const KEYCLOAK_ROLES_KEY = 'keycloak.roles';

/**
 * Decorator for Keycloak token role checking.
 * Extracts roles from realm_access.roles and resource_access.<client>.roles,
 * and from user.roles when set by KeycloakAuthGuard.
 * Use on routes that require specific roles when Keycloak is the auth method.
 */
export const KeycloakRoles = (...roles: UserRole[]) =>
  applyDecorators(SetMetadata(KEYCLOAK_ROLES_KEY, roles), UseGuards(KeycloakRolesGuard));
