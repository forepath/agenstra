import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { from, switchMap } from 'rxjs';
import { IDENTITY_AUTH_ENVIRONMENT } from './auth-environment';

const API_KEY_STORAGE_KEY = 'agent-controller-api-key';
const USERS_JWT_STORAGE_KEY = 'agent-controller-users-jwt';

/**
 * HTTP interceptor that conditionally applies API key, Keycloak, or users JWT authentication
 * based on the identity auth environment configuration.
 *
 * Requires `IDENTITY_AUTH_ENVIRONMENT` to be provided in the application.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authEnv = inject(IDENTITY_AUTH_ENVIRONMENT);
  const keycloakService = inject(KeycloakService, { optional: true });

  const apiUrl = authEnv.apiUrl;
  if (!apiUrl || !req.url.startsWith(apiUrl)) {
    return next(req);
  }

  if (authEnv.authentication.type === 'api-key') {
    const apiKey = authEnv.authentication.apiKey ?? localStorage.getItem(API_KEY_STORAGE_KEY);
    if (apiKey) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${apiKey}` } }));
    }
    return next(req);
  }

  if (authEnv.authentication.type === 'keycloak' && keycloakService) {
    return from(keycloakService.getToken()).pipe(
      switchMap((token) => (token ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })) : next(req))),
    );
  }

  if (authEnv.authentication.type === 'users') {
    const jwt = localStorage.getItem(USERS_JWT_STORAGE_KEY);
    if (jwt) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${jwt}` } }));
    }
  }

  return next(req);
};

/**
 * Returns the authentication HTTP interceptor function.
 * Use this with `withInterceptors` from `@angular/common/http` to enable
 * conditional API key, Keycloak, or users JWT authentication for API requests.
 *
 * @example
 * ```typescript
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { getAuthInterceptor } from '@forepath/identity/frontend';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideHttpClient(withInterceptors([getAuthInterceptor()])),
 *   ],
 * });
 * ```
 *
 * @returns The authentication interceptor function
 */
export function getAuthInterceptor(): HttpInterceptorFn {
  return authInterceptor;
}
