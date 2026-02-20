import { InjectionToken } from '@angular/core';

/**
 * Minimal locale service interface required by identity auth features.
 * The identity domain only needs the ability to build locale-aware URLs
 * for navigation (e.g., after login redirect to /clients).
 *
 * Consuming applications provide their own locale service implementation
 * via the `IDENTITY_LOCALE_SERVICE` injection token.
 */
export interface IdentityLocaleService {
  /**
   * Builds an absolute URL path array with locale prefix if applicable.
   * In production, this typically prepends the current locale segment
   * to the path (e.g., `['/clients']` → `['/', 'en', 'clients']`).
   * In development, it usually returns the path unchanged.
   *
   * @param path - The route path segments (e.g., `['/clients']`)
   * @returns The locale-prefixed path array for use with `Router.navigate()`
   */
  buildAbsoluteUrl(path: unknown[]): unknown[];
}

/**
 * Injection token for the identity locale service.
 * Applications must provide this token with an `IdentityLocaleService` implementation.
 *
 * @example
 * ```typescript
 * import { IDENTITY_LOCALE_SERVICE } from '@forepath/identity/frontend';
 * import { LocaleService } from '@forepath/framework/frontend/util-configuration';
 *
 * {
 *   provide: IDENTITY_LOCALE_SERVICE,
 *   useExisting: LocaleService,
 * }
 * ```
 */
export const IDENTITY_LOCALE_SERVICE = new InjectionToken<IdentityLocaleService>('IdentityLocaleService');
