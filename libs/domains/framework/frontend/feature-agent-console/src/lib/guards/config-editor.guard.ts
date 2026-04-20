import { inject } from '@angular/core';
import { type ActivatedRouteSnapshot, Router, type CanActivateFn } from '@angular/router';
// Avoid data-access barrel: it re-exports identity (Keycloak), which breaks lightweight Jest runs.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { ClientsFacade } from '../../../../data-access-agent-console/src/lib/state/clients/clients.facade';
import { filter, map, take } from 'rxjs';

/**
 * Ensures the user may open the provider config file editor for the workspace in the URL.
 * Redirects to the agent chat route when `canManageWorkspaceConfiguration` is false.
 */
export const configEditorGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const clientsFacade = inject(ClientsFacade);
  const router = inject(Router);
  const clientId = route.paramMap.get('clientId')?.trim();
  const agentId = route.paramMap.get('agentId')?.trim();

  if (!clientId || !agentId) {
    return router.createUrlTree(['clients']);
  }

  clientsFacade.setActiveClient(clientId);
  clientsFacade.loadClient(clientId);

  return clientsFacade.getClientById$(clientId).pipe(
    filter((client) => client !== null),
    take(1),
    map((client) =>
      client!.canManageWorkspaceConfiguration ? true : router.createUrlTree(['clients', clientId, 'agents', agentId]),
    ),
  );
};
