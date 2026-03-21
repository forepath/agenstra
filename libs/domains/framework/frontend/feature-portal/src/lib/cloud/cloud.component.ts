import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, LOCALE_ID, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ServicePlansFacade } from '@forepath/framework/frontend/data-access-portal';
import { ENVIRONMENT, type Environment } from '@forepath/framework/frontend/util-configuration';

import { PortalCloudMapComponent } from './map/map.component';

@Component({
  selector: 'framework-portal-cloud',
  imports: [CommonModule, RouterModule, PortalCloudMapComponent],
  styleUrls: ['./cloud.component.scss'],
  templateUrl: './cloud.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalCloudComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly servicePlansFacade = inject(ServicePlansFacade);
  private readonly locale = inject(LOCALE_ID);

  readonly billingBaseUrl = this.environment.production
    ? `${this.environment.billing.frontendUrl}/${this.locale}/subscriptions?order=true`
    : `${this.environment.billing.frontendUrl}/subscriptions?order=true`;

  readonly cheapestOffering = toSignal(this.servicePlansFacade.getCheapestServicePlanOffering$(), {
    initialValue: null,
  });

  readonly cheapestOfferingLoading = toSignal(this.servicePlansFacade.getCheapestServicePlanOfferingLoading$(), {
    initialValue: false,
  });

  ngOnInit(): void {
    this.titleService.setTitle(
      $localize`:@@featurePortalCloud-metaTitle:Agenstra Cloud - Fully Managed Control Plane For Your AI Agents`,
    );
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalCloud-metaDescription:Agenstra Cloud is the fully managed, cloud hosted control plane for distributed AI agents. Design, deploy, and govern agents across tools, clouds, and environments without operating your own infrastructure.`,
      },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalCloud-metaKeywords:Agenstra Cloud, Agenstra, AI agent platform, AI control plane, AI governance, AI observability, managed SaaS, agentic systems`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com/cloud' },
    ]);

    this.servicePlansFacade.loadCheapestServicePlanOffering();
  }
}
