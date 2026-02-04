import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { Environment, UsersAuthenticationConfig } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT, LocaleService } from '@forepath/framework/frontend/util-configuration';

/**
 * Guard that redirects to login when signup is disabled (users auth only).
 * Use on the register route to prevent direct navigation when DISABLE_SIGNUP is true.
 */
export const signupDisabledGuard: CanActivateFn = () => {
  const environment = inject<Environment>(ENVIRONMENT);
  const router = inject(Router);
  const localeService = inject(LocaleService);

  if (environment.authentication.type !== 'users') {
    return true;
  }

  const usersAuth = environment.authentication as UsersAuthenticationConfig;
  if (usersAuth.disableSignup === true) {
    return router.createUrlTree(localeService.buildAbsoluteUrl(['/login']));
  }

  return true;
};
