import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthGuard, ResourceGuard, RoleGuard } from 'nest-keycloak-connect';

/** Supported authentication methods. */
export type AuthenticationMethod = 'api-key' | 'keycloak' | 'users';

/** Default authentication method when AUTHENTICATION_METHOD is explicitly set to api-key. */
export const DEFAULT_AUTHENTICATION_METHOD: AuthenticationMethod = 'api-key';

/**
 * Resolves the effective authentication method from environment variables.
 * - AUTHENTICATION_METHOD: explicit choice ('api-key' | 'keycloak' | 'users')
 * - Fallback when not set: STATIC_API_KEY set -> 'api-key', else -> 'keycloak' (backward compatibility)
 */
export function getAuthenticationMethod(): AuthenticationMethod {
  const explicit = process.env.AUTHENTICATION_METHOD?.toLowerCase().trim();
  if (explicit === 'api-key' || explicit === 'keycloak' || explicit === 'users') {
    return explicit;
  }
  // Backward compatibility: STATIC_API_KEY set -> api-key, else -> keycloak
  if (process.env.STATIC_API_KEY) {
    return 'api-key';
  }
  return 'keycloak';
}

/**
 * Guard that validates static API key authentication.
 * When AUTHENTICATION_METHOD is 'api-key' (or STATIC_API_KEY is set for backward compatibility),
 * only API key authentication is used (no Keycloak fallback, no anonymous access).
 * When 'keycloak' or 'users', this guard allows requests to proceed to the respective auth guards.
 */
@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Allow health check endpoint without authentication
    if (path === '/api/health') {
      return true;
    }

    const authMethod = getAuthenticationMethod();
    const staticApiKey = process.env.STATIC_API_KEY;

    // api-key: require STATIC_API_KEY to be set and validate it
    const useApiKey = authMethod === 'api-key' && staticApiKey;

    if (authMethod === 'api-key' && !staticApiKey) {
      throw new UnauthorizedException(
        'API key authentication is configured but STATIC_API_KEY is not set. Set STATIC_API_KEY or use a different AUTHENTICATION_METHOD.',
      );
    }

    if (useApiKey) {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedException('Missing authorization header');
      }

      // Support both "Bearer <key>" and "ApiKey <key>" formats
      const parts = authHeader.split(' ');
      if (parts.length !== 2) {
        throw new UnauthorizedException('Invalid authorization header format');
      }

      const [scheme, providedKey] = parts;

      // Accept both "Bearer" and "ApiKey" schemes for API key
      if ((scheme === 'Bearer' || scheme === 'ApiKey') && providedKey === staticApiKey) {
        // Attach user object: API key auth always implicates admin rights
        request.user = {
          id: 'api-key-user',
          username: 'api-key',
          roles: ['admin', 'user'],
        };
        // Mark that API key authentication succeeded
        request.apiKeyAuthenticated = true;
        return true;
      }

      // API key doesn't match - reject (no Keycloak fallback, no anonymous access)
      throw new UnauthorizedException('Invalid API key');
    }

    // keycloak or users: let respective guards handle authentication
    return true;
  }
}

/**
 * Guard providers that conditionally include API key guard and Keycloak guards.
 * - AUTHENTICATION_METHOD=api-key (and STATIC_API_KEY set): Only API key guard
 * - AUTHENTICATION_METHOD=keycloak: Keycloak guards
 * - AUTHENTICATION_METHOD=users: JWT guard (handled by UsersAuthModule)
 */
export function getHybridAuthGuards() {
  const authMethod = getAuthenticationMethod();
  const guards: Array<{ provide: typeof APP_GUARD; useClass: new (...args: unknown[]) => CanActivate }> = [];

  // Always add HybridAuthGuard (checks AUTHENTICATION_METHOD and STATIC_API_KEY)
  guards.push({
    provide: APP_GUARD,
    useClass: HybridAuthGuard,
  });

  // Add Keycloak guards only when using keycloak auth
  if (authMethod === 'keycloak') {
    guards.push(
      {
        provide: APP_GUARD,
        useClass: AuthGuard,
      },
      {
        provide: APP_GUARD,
        useClass: ResourceGuard,
      },
      {
        provide: APP_GUARD,
        useClass: RoleGuard,
      },
    );
  }

  return guards;
}
