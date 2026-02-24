import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withRouterConfig } from '@angular/router';
import { getAuthInterceptor } from '@forepath/framework/frontend/data-access-agent-console';
import {
  Environment,
  ENVIRONMENT,
  environment,
  LocaleService,
  provideLocale,
} from '@forepath/framework/frontend/util-configuration';
import {
  IDENTITY_AUTH_ENVIRONMENT,
  IDENTITY_LOCALE_SERVICE,
  LOGIN_SUCCESS_REDIRECT_TARGET,
  provideKeycloak,
} from '@forepath/identity/frontend';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { ComponentReuseStrategy } from './strategies/component-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Wire identity injection tokens to framework's environment and locale service.
    // IDENTITY_AUTH_ENVIRONMENT maps the full Environment to the auth-relevant subset.
    // IDENTITY_LOCALE_SERVICE delegates to the framework's LocaleService.
    {
      provide: IDENTITY_AUTH_ENVIRONMENT,
      useFactory: (env: Environment) => ({
        apiUrl: env.controller.restApiUrl,
        authentication: env.authentication,
        controllerApiUrl: env.controller.restApiUrl,
      }),
      deps: [ENVIRONMENT],
    },
    {
      provide: IDENTITY_LOCALE_SERVICE,
      useExisting: LocaleService,
    },
    {
      provide: LOGIN_SUCCESS_REDIRECT_TARGET,
      useValue: ['/clients'],
    },
    // Provide KeycloakService before HTTP client so interceptor can inject it
    ...(environment.authentication.type === 'keycloak' ? provideKeycloak() : []),
    // Provide HTTP client with auth interceptor (KeycloakService must be available)
    provideHttpClient(withInterceptors([getAuthInterceptor()])),
    // NgRx Store - base store required at root level
    provideStore(),
    // NgRx Store DevTools - only enabled in non-production environments
    ...(environment.production
      ? []
      : [
          provideStoreDevtools({
            maxAge: 25,
          }),
        ]),
    provideRouter(
      [
        ...(environment.production
          ? [
              {
                path: 'de',
                loadChildren: () =>
                  import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
              },
              {
                path: 'en',
                loadChildren: () =>
                  import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
              },
            ]
          : []),
        {
          path: '',
          loadChildren: () =>
            import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
        },
      ],
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    // Custom RouteReuseStrategy to reuse component instances when navigating between routes with the same component
    { provide: RouteReuseStrategy, useClass: ComponentReuseStrategy },
    // Provide APP_BASE_HREF (defaults to '/' if not provided)
    { provide: APP_BASE_HREF, useValue: '/' },
    provideLocale(),
  ],
};
