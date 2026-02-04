import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { KeycloakService } from 'keycloak-angular';
import { from, switchMap } from 'rxjs';

const API_KEY_STORAGE_KEY = 'agent-controller-api-key';
const USERS_JWT_STORAGE_KEY = 'agent-controller-users-jwt';

/**
 * HTTP interceptor that conditionally applies API key, Keycloak, or users JWT authentication
 * based on the environment configuration.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const environment = inject<Environment>(ENVIRONMENT);
  const keycloakService = inject(KeycloakService, { optional: true });

  const apiUrl = environment.controller.restApiUrl;
  if (!apiUrl || !req.url.startsWith(apiUrl)) {
    return next(req);
  }

  if (environment.authentication.type === 'api-key') {
    const apiKey = environment.authentication.apiKey ?? localStorage.getItem(API_KEY_STORAGE_KEY);
    if (apiKey) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${apiKey}` } }));
    }
    return next(req);
  }

  if (environment.authentication.type === 'keycloak' && keycloakService) {
    return from(keycloakService.getToken()).pipe(
      switchMap((token) => (token ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })) : next(req))),
    );
  }

  if (environment.authentication.type === 'users') {
    const jwt = localStorage.getItem(USERS_JWT_STORAGE_KEY);
    if (jwt) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${jwt}` } }));
    }
  }

  return next(req);
};
