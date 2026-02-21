import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withRouterConfig } from '@angular/router';
import { getAuthInterceptor } from '@forepath/framework/frontend/data-access-billing-console';
import {
  Environment,
  ENVIRONMENT,
  environment,
  LocaleService,
  provideLocale,
} from '@forepath/framework/frontend/util-configuration';
import { IDENTITY_AUTH_ENVIRONMENT, IDENTITY_LOCALE_SERVICE, provideKeycloak } from '@forepath/identity/frontend';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { ComponentReuseStrategy } from './strategies/component-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    {
      provide: IDENTITY_AUTH_ENVIRONMENT,
      useFactory: (env: Environment) => ({
        apiUrl: env.billing.restApiUrl,
        authentication: env.authentication,
        controllerApiUrl: env.billing.restApiUrl,
      }),
      deps: [ENVIRONMENT],
    },
    {
      provide: IDENTITY_LOCALE_SERVICE,
      useExisting: LocaleService,
    },
    ...(environment.authentication.type === 'keycloak' ? provideKeycloak() : []),
    provideHttpClient(withInterceptors([getAuthInterceptor()])),
    provideStore(),
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
                  import('@forepath/framework/frontend/feature-billing-console').then(
                    (app) => app.billingConsoleRoutes,
                  ),
              },
              {
                path: 'en',
                loadChildren: () =>
                  import('@forepath/framework/frontend/feature-billing-console').then(
                    (app) => app.billingConsoleRoutes,
                  ),
              },
            ]
          : []),
        {
          path: '',
          loadChildren: () =>
            import('@forepath/framework/frontend/feature-billing-console').then((app) => app.billingConsoleRoutes),
        },
      ],
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    { provide: RouteReuseStrategy, useClass: ComponentReuseStrategy },
    { provide: APP_BASE_HREF, useValue: '/' },
    provideLocale(),
  ],
};
