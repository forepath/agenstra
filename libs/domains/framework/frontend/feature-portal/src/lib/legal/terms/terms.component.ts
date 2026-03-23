import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-legal-terms',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./terms.component.scss'],
  templateUrl: './terms.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalLegalTermsComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  ngOnInit(): void {
    this.titleService.setTitle($localize`:@@featurePortalTerms-metaTitle:Agenstra - Terms of Service`);
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalTerms-metaDescription:Agenstra is a platform for managing distributed AI agent infrastructure. This is the terms of service for the platform.`,
      },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalTerms-metaKeywords:Agenstra, terms of service, platform, distributed AI agent infrastructure`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com/legal/terms' },
    ]);
  }
}
