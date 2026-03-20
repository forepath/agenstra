import { Route } from '@angular/router';
import {
  ServicePlansFacade,
  loadCheapestServicePlanOffering$,
  loadServicePlans$,
  loadServicePlansBatch$,
  servicePlansReducer,
} from '@forepath/framework/frontend/data-access-portal';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { PortalAgentCtxComponent } from './agentctx/agentctx.component';
import { PortalContainerComponent } from './container/container.component';
import { PortalDesktopComponent } from './desktop/desktop.component';
import { PortalHomeComponent } from './home/home.component';
import { PortalLegalDisclosureComponent } from './legal/disclosure/disclosure.component';
import { PortalLegalPrivacyComponent } from './legal/privacy/privacy.component';
import { PortalPricingComponent } from './pricing/pricing.component';

export const portalRoutes: Route[] = [
  {
    path: '',
    component: PortalContainerComponent,
    providers: [
      ServicePlansFacade,
      provideState('servicePlans', servicePlansReducer),
      provideEffects({
        loadServicePlans$,
        loadServicePlansBatch$,
        loadCheapestServicePlanOffering$,
      }),
    ],
    children: [
      {
        path: '',
        component: PortalHomeComponent,
      },
      {
        path: 'agentctx',
        component: PortalAgentCtxComponent,
      },
      {
        path: 'desktop',
        component: PortalDesktopComponent,
      },
      {
        path: 'pricing',
        component: PortalPricingComponent,
      },
      {
        path: 'legal/disclosure',
        component: PortalLegalDisclosureComponent,
      },
      {
        path: 'legal/privacy',
        component: PortalLegalPrivacyComponent,
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
