import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-legal-privacy',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./privacy.component.scss'],
  templateUrl: './privacy.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalLegalPrivacyComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  ngOnInit(): void {
    this.titleService.setTitle($localize`:@@featurePortalPrivacy-metaTitle:Agenstra - Privacy Policy`);
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalPrivacy-metaDescription:Agenstra is a platform for managing distributed AI agent infrastructure. This is the privacy policy for the platform.`,
      },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalPrivacy-metaKeywords:Agenstra, privacy policy, platform, distributed AI agent infrastructure`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com/legal/privacy' },
    ]);
  }
}
