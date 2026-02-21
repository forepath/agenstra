import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type: string;
  scope?: string;
}

interface CachedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Service for fetching JWT tokens from Keycloak using OAuth2 Client Credentials flow.
 * Implements token caching to avoid unnecessary requests to Keycloak.
 */
@Injectable()
export class KeycloakTokenService {
  private readonly logger = new Logger(KeycloakTokenService.name);
  private readonly tokenCache = new Map<string, CachedToken>();

  /**
   * Get a JWT access token from Keycloak using client credentials flow.
   * Tokens are cached and automatically refreshed before expiration.
   * @param authServerUrl - Keycloak authentication server URL (e.g., https://keycloak.example.com)
   * @param realm - Keycloak realm name
   * @param clientId - Keycloak client ID
   * @param clientSecret - Keycloak client secret
   * @returns JWT access token
   * @throws Error if token request fails
   */
  async getAccessToken(authServerUrl: string, realm: string, clientId: string, clientSecret: string): Promise<string> {
    // Create cache key from credentials
    const cacheKey = `${authServerUrl}:${realm}:${clientId}`;

    // Check if we have a valid cached token
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      this.logger.debug(`Using cached token for client ${clientId} in realm ${realm}`);
      return cached.token;
    }

    // Fetch new token from Keycloak
    try {
      const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
      this.logger.debug(`Fetching token from Keycloak: ${tokenUrl}`);

      const response = await axios.post<TokenResponse>(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error('Keycloak did not return an access token');
      }

      // Cache the token (expire 30 seconds before actual expiration for safety)
      const expiresAt = new Date(Date.now() + (expires_in - 30) * 1000);
      this.tokenCache.set(cacheKey, {
        token: access_token,
        expiresAt,
      });

      this.logger.log(`Successfully obtained token for client ${clientId} in realm ${realm}`);
      return access_token;
    } catch (error) {
      const err = error as AxiosError<{ error?: string; error_description?: string }>;
      const errorMessage = err.response?.data?.error_description || err.message || 'Unknown error';
      this.logger.error(
        `Failed to get token from Keycloak for client ${clientId} in realm ${realm}: ${errorMessage}`,
        err.response?.data,
      );
      throw new Error(`Failed to authenticate with Keycloak: ${errorMessage}`);
    }
  }

  /**
   * Clear cached token for a specific client.
   * Useful when client credentials are updated.
   * @param authServerUrl - Keycloak authentication server URL
   * @param realm - Keycloak realm name
   * @param clientId - Keycloak client ID
   */
  clearCache(authServerUrl: string, realm: string, clientId: string): void {
    const cacheKey = `${authServerUrl}:${realm}:${clientId}`;
    this.tokenCache.delete(cacheKey);
    this.logger.debug(`Cleared token cache for client ${clientId} in realm ${realm}`);
  }

  /**
   * Clear all cached tokens.
   * Useful for testing or when credentials are globally updated.
   */
  clearAllCache(): void {
    this.tokenCache.clear();
    this.logger.debug('Cleared all token caches');
  }
}
