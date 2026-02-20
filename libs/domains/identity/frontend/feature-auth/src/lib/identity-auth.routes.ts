import { Route } from '@angular/router';
import {
  AuthenticationFacade,
  authenticationReducer,
  changePassword$,
  checkAuthentication$,
  confirmEmail$,
  confirmEmailSuccessRedirect$,
  createUser$,
  deleteUser$,
  loadUsers$,
  loadUsersBatch$,
  login$,
  loginSuccessRedirect$,
  logout$,
  logoutSuccessRedirect$,
  register$,
  registerSuccessRedirect$,
  requestPasswordReset$,
  requestPasswordResetSuccessRedirect$,
  resetPassword$,
  resetPasswordSuccessRedirect$,
  updateUser$,
} from '@forepath/identity/frontend';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { IdentityConfirmEmailComponent } from './confirm-email/confirm-email.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { signupDisabledGuard } from './guards/signup-disabled.guard';
import { IdentityLoginComponent } from './login/login.component';
import { IdentityRegisterComponent } from './register/register.component';
import { IdentityRequestPasswordResetConfirmationComponent } from './request-password-reset-confirmation/request-password-reset-confirmation.component';
import { IdentityRequestPasswordResetComponent } from './request-password-reset/request-password-reset.component';
import { IdentityResetPasswordComponent } from './reset-password/reset-password.component';
import { IdentityUserManagerComponent } from './user-manager/user-manager.component';

/**
 * Identity auth routes for use in consuming applications.
 * These routes provide login, registration, password reset, email confirmation,
 * and user management functionality.
 *
 * The consuming application must provide:
 * - `IDENTITY_AUTH_ENVIRONMENT` token with `IdentityAuthEnvironment` value
 * - `IDENTITY_LOCALE_SERVICE` token with `IdentityLocaleService` implementation
 *
 * @example
 * ```typescript
 * import { identityAuthRoutes } from '@forepath/identity/frontend';
 *
 * const appRoutes: Route[] = [
 *   {
 *     path: '',
 *     children: [
 *       ...identityAuthRoutes,
 *       // ... other app routes
 *     ],
 *   },
 * ];
 * ```
 */
export const identityAuthRoutes: Route[] = [
  {
    path: 'login',
    component: IdentityLoginComponent,
    canActivate: [loginGuard],
    title: 'Login | Agenstra',
  },
  {
    path: 'register',
    component: IdentityRegisterComponent,
    canActivate: [signupDisabledGuard, loginGuard],
    title: 'Register | Agenstra',
  },
  {
    path: 'request-password-reset',
    component: IdentityRequestPasswordResetComponent,
    canActivate: [loginGuard],
    title: 'Request Password Reset | Agenstra',
  },
  {
    path: 'request-password-reset-confirmation',
    component: IdentityRequestPasswordResetConfirmationComponent,
    canActivate: [loginGuard],
    title: 'Password Reset Requested | Agenstra',
  },
  {
    path: 'reset-password',
    component: IdentityResetPasswordComponent,
    canActivate: [loginGuard],
    title: 'Reset Password | Agenstra',
  },
  {
    path: 'confirm-email',
    component: IdentityConfirmEmailComponent,
    canActivate: [loginGuard],
    title: 'Confirm Email | Agenstra',
  },
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    component: IdentityUserManagerComponent,
    title: 'User Management | Agenstra',
  },
];

/**
 * NgRx providers for identity authentication state.
 * Include these in the route providers of the parent route
 * that contains the identity auth routes.
 *
 * @example
 * ```typescript
 * import { identityAuthRoutes, identityAuthProviders } from '@forepath/identity/frontend';
 *
 * const appRoutes: Route[] = [
 *   {
 *     path: '',
 *     children: [
 *       ...identityAuthRoutes,
 *       // ... other app routes
 *     ],
 *     providers: [
 *       ...identityAuthProviders,
 *       // ... other providers
 *     ],
 *   },
 * ];
 * ```
 */
export const identityAuthProviders = [
  AuthenticationFacade,
  provideState('authentication', authenticationReducer),
  provideEffects({
    login$,
    loginSuccessRedirect$,
    register$,
    registerSuccessRedirect$,
    confirmEmail$,
    confirmEmailSuccessRedirect$,
    requestPasswordReset$,
    requestPasswordResetSuccessRedirect$,
    resetPassword$,
    resetPasswordSuccessRedirect$,
    logout$,
    logoutSuccessRedirect$,
    checkAuthentication$,
    changePassword$,
    loadUsers$,
    loadUsersBatch$,
    createUser$,
    updateUser$,
    deleteUser$,
  }),
];
