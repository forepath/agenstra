import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
// Import from util-auth barrel directly to avoid circular dependency
// (feature-auth is re-exported from the @forepath/identity/frontend barrel)
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  IDENTITY_AUTH_ENVIRONMENT,
  IDENTITY_LOCALE_SERVICE,
  type IdentityAuthEnvironment,
  type IdentityLocaleService,
  isAuthenticated,
} from '../../../../util-auth/src';

/**
 * LocalStorage key for storing the API key
 */
const API_KEY_STORAGE_KEY = 'agent-controller-api-key';

/**
 * LocalStorage key for storing the JWT (users authentication)
 */
const USERS_JWT_STORAGE_KEY = 'agent-controller-users-jwt';

/**
 * Guard that protects routes based on authentication configuration.
 * - If authentication type is 'keycloak', uses Keycloak authentication guard
 * - If authentication type is 'api-key', allows access if API key exists in environment or localStorage
 * - If authentication type is 'users', allows access if valid JWT exists in localStorage
 * - Otherwise, redirects to /login route
 */
export const authGuard: CanActivateFn = (route, state) => {
  const environment = inject<IdentityAuthEnvironment>(IDENTITY_AUTH_ENVIRONMENT);
  const router = inject(Router);
  const localeService = inject<IdentityLocaleService>(IDENTITY_LOCALE_SERVICE);

  if (environment.authentication.type === 'keycloak') {
    // Use Keycloak guard for authentication
    return isAuthenticated(route, state);
  }

  if (environment.authentication.type === 'api-key') {
    // Check if API key exists in environment
    const envApiKey = environment.authentication.apiKey;
    if (envApiKey) {
      // API key found in environment, allow access
      return true;
    }

    // Check if API key exists in localStorage
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      // API key found in localStorage, allow access
      return true;
    }

    // No API key found in environment or localStorage, redirect to login
    return router.createUrlTree(localeService.buildAbsoluteUrl(['/login']) as string[]);
  }

  if (environment.authentication.type === 'users') {
    const jwt = localStorage.getItem(USERS_JWT_STORAGE_KEY);
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1] ?? '{}'));
        const exp = payload.exp ? payload.exp * 1000 : 0;
        if (exp > Date.now()) {
          return true;
        }
      } catch {
        // Invalid JWT, fall through to redirect
      }
    }
    return router.createUrlTree(localeService.buildAbsoluteUrl(['/login']) as string[]);
  }

  // For other authentication types, redirect to login
  return router.createUrlTree(localeService.buildAbsoluteUrl(['/login']) as string[]);
};
