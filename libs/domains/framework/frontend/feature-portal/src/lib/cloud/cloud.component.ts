import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

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
  }
}
