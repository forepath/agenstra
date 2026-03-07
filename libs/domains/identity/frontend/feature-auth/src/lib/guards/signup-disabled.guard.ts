import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { IdentityAuthEnvironment, UsersAuthenticationConfig } from '@forepath/identity/frontend';
import { IDENTITY_AUTH_ENVIRONMENT } from '@forepath/identity/frontend';

/**
 * Guard that redirects to login when signup is disabled (users auth only).
 * Use on the register route to prevent direct navigation when DISABLE_SIGNUP is true.
 */
export const signupDisabledGuard: CanActivateFn = () => {
  const environment = inject<IdentityAuthEnvironment>(IDENTITY_AUTH_ENVIRONMENT);
  const router = inject(Router);

  if (environment.authentication.type !== 'users') {
    return true;
  }

  const usersAuth = environment.authentication as UsersAuthenticationConfig;
  if (usersAuth.disableSignup === true) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
