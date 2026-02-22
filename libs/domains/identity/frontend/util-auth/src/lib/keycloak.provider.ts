import { APP_INITIALIZER, inject, Provider } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { IDENTITY_AUTH_ENVIRONMENT } from './auth-environment';

/**
 * Initializes KeycloakService with the configuration from the identity auth environment.
 * This function is used as an APP_INITIALIZER to ensure Keycloak is initialized
 * before the application starts.
 */
function initializeKeycloak(): () => Promise<boolean> {
  return () => {
    const keycloakService = inject(KeycloakService);
    const authEnv = inject(IDENTITY_AUTH_ENVIRONMENT);

    if (authEnv.authentication.type === 'keycloak') {
      return keycloakService
        .init({
          config: {
            url: authEnv.authentication.authServerUrl,
            realm: authEnv.authentication.realm,
            clientId: authEnv.authentication.clientId,
          },
          initOptions: {
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
            checkLoginIframe: false,
          },
          loadUserProfileAtStartUp: false,
        })
        .then(() => {
          // Ensure the Keycloak instance is provided for injection
          // KeycloakService should handle this, but we make it explicit
          return true;
        });
    }

    // Return resolved promise if not using Keycloak
    return Promise.resolve(true);
  };
}

/**
 * Provides KeycloakService and initializes it with the environment configuration.
 * Also provides the Keycloak instance for direct injection (required by createAuthGuard).
 * This should only be used when authentication type is 'keycloak'.
 *
 * @returns Array of providers for KeycloakService initialization
 */
export function provideKeycloak(): Provider[] {
  return [
    KeycloakService,
    // Provide Keycloak instance for direct injection (used by createAuthGuard)
    // The instance is retrieved from KeycloakService after initialization
    {
      provide: Keycloak,
      useFactory: (keycloakService: KeycloakService) => {
        return keycloakService.getKeycloakInstance();
      },
      deps: [KeycloakService],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
    },
  ];
}
