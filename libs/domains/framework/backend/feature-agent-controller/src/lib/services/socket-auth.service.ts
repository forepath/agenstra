import { Inject, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getAuthenticationMethod } from '@forepath/identity/backend';
import { KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
import type { SocketUserInfo } from '../utils/client-access.utils';

/** Minimal Keycloak interface for token validation */
interface KeycloakInstance {
  grantManager: {
    createGrant: (p: { access_token: string }) => Promise<{ access_token: unknown }>;
    validateAccessToken: (t: unknown) => Promise<unknown>;
  };
}
import { UserRole } from '../entities/user.entity';

@Injectable()
export class SocketAuthService {
  constructor(
    @Optional() @Inject(KEYCLOAK_INSTANCE) private readonly keycloak: KeycloakInstance | null,
    @Optional() private readonly jwtService: JwtService | null,
  ) {}

  /**
   * Validate Authorization header and return user info for client access checks.
   * Uses same auth logic as HTTP: api-key, keycloak, or users (JWT).
   */
  async validateAndGetUser(authHeader: string | undefined): Promise<SocketUserInfo | null> {
    if (!authHeader) {
      return null;
    }

    const authMethod = getAuthenticationMethod();

    if (authMethod === 'api-key') {
      return this.validateApiKey(authHeader);
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    if (authMethod === 'keycloak' && this.keycloak) {
      return this.validateKeycloakToken(token);
    }

    if (authMethod === 'users' && this.jwtService) {
      return this.validateUsersToken(token);
    }

    return null;
  }

  private validateApiKey(authHeader: string): SocketUserInfo | null {
    const staticApiKey = process.env.STATIC_API_KEY;
    if (!staticApiKey) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return null;
    }

    const [scheme, providedKey] = parts;
    if ((scheme === 'Bearer' || scheme === 'ApiKey') && providedKey === staticApiKey) {
      return {
        isApiKeyAuth: true,
        user: { id: 'api-key-user', roles: ['admin', 'user'] },
      };
    }

    return null;
  }

  private async validateKeycloakToken(token: string): Promise<SocketUserInfo | null> {
    try {
      const grant = await this.keycloak!.grantManager.createGrant({ access_token: token });
      const accessToken = grant.access_token;
      const isValid = await this.keycloak!.grantManager.validateAccessToken(accessToken);
      if (isValid !== accessToken) {
        return null;
      }

      const payload = this.parseJwtPayload(token);
      const roles = payload.realm_access?.roles ?? [];
      const isAdmin = roles.includes('admin') || roles.includes('realm-admin');

      return {
        userId: payload.sub,
        userRole: isAdmin ? UserRole.ADMIN : UserRole.USER,
        isApiKeyAuth: false,
        user: {
          id: payload.sub,
          roles: roles,
        },
      };
    } catch {
      return null;
    }
  }

  private async validateUsersToken(token: string): Promise<SocketUserInfo | null> {
    try {
      const payload = await this.jwtService!.verifyAsync<{ sub: string; email?: string; roles?: string[] }>(token);
      const roles = payload.roles ?? ['user'];
      const isAdmin = roles.includes('admin');

      return {
        userId: payload.sub,
        userRole: isAdmin ? UserRole.ADMIN : UserRole.USER,
        isApiKeyAuth: false,
        user: {
          id: payload.sub,
          email: payload.email,
          roles,
        },
      };
    } catch {
      return null;
    }
  }

  private parseJwtPayload(token: string): { sub: string; realm_access?: { roles?: string[] } } {
    const parts = token.split('.');
    if (parts.length < 2) {
      return { sub: '' };
    }
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  }
}
