import { Route } from '@angular/router';
import { PortalAgentCtxComponent } from './agentctx/agentctx.component';
import { PortalCloudComponent } from './cloud/cloud.component';
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
        path: 'cloud',
        component: PortalCloudComponent,
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
