import { inject } from '@angular/core';
import { ActivatedRoute, type ActivatedRouteSnapshot, Router, type CanActivateFn } from '@angular/router';
// Avoid data-access barrel: it re-exports identity (Keycloak), which breaks lightweight Jest runs.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { ClientsFacade } from '../../../../data-access-agent-console/src/lib/state/clients/clients.facade';
import { map, take } from 'rxjs';

/**
 * Tickets routing:
 * - `/tickets/:clientId` — activates that workspace and shows its board (deep link / bookmark).
 * - `/tickets` — redirects to `/tickets/{activeClientId}` when a workspace is already selected,
 *   otherwise to the sibling `clients` route (locale prefix preserved via `relativeTo`).
 */
export const ticketsRequireActiveClientGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const clientsFacade = inject(ClientsFacade);
  const router = inject(Router);
  const activatedRoute = inject(ActivatedRoute);
  const relativeTo = activatedRoute.parent ?? undefined;
  const clientIdFromUrl = route.paramMap.get('clientId')?.trim();

  if (clientIdFromUrl) {
    clientsFacade.setActiveClient(clientIdFromUrl);
    return true;
  }

  return clientsFacade.activeClientId$.pipe(
    take(1),
    map((activeId) => {
      if (activeId) {
        return router.createUrlTree(['tickets', activeId], { relativeTo });
      }
      return router.createUrlTree(['clients'], { relativeTo });
    }),
  );
};
