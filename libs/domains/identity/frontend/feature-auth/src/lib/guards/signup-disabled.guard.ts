import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { IdentityAuthEnvironment, UsersAuthenticationConfig } from '@forepath/identity/frontend';
import {
  IDENTITY_AUTH_ENVIRONMENT,
  IDENTITY_LOCALE_SERVICE,
  type IdentityLocaleService,
} from '@forepath/identity/frontend';

/**
 * Guard that redirects to login when signup is disabled (users auth only).
 * Use on the register route to prevent direct navigation when DISABLE_SIGNUP is true.
 */
export const signupDisabledGuard: CanActivateFn = () => {
  const environment = inject<IdentityAuthEnvironment>(IDENTITY_AUTH_ENVIRONMENT);
  const router = inject(Router);
  const localeService = inject<IdentityLocaleService>(IDENTITY_LOCALE_SERVICE);

  if (environment.authentication.type !== 'users') {
    return true;
  }

  const usersAuth = environment.authentication as UsersAuthenticationConfig;
  if (usersAuth.disableSignup === true) {
    return router.createUrlTree(localeService.buildAbsoluteUrl(['/login']) as string[]);
  }

  return true;
};
