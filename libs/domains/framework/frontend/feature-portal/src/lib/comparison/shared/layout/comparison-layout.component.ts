import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { PortalComparisonMatrixComponent } from '../matrix/comparison-matrix.component';
import { PORTAL_COMPARISON_NAV_ITEMS } from '../misc/comparison-nav.items';
import type { ComparisonPageConfig } from '../misc/comparison-page.model';

@Component({
  selector: 'framework-portal-comparison-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, PortalComparisonMatrixComponent],
  templateUrl: './comparison-layout.component.html',
  styleUrl: './comparison-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalComparisonLayoutComponent implements OnInit {
  @Input({ required: true }) page!: ComparisonPageConfig;

  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  get otherComparisons() {
    return PORTAL_COMPARISON_NAV_ITEMS.filter((item) => item.slug !== this.page.slug);
  }

  ngOnInit(): void {
    this.titleService.setTitle(this.page.metaTitle);
    this.metaService.addTags([
      { name: 'description', content: this.page.metaDescription },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalComparison-metaKeywords:Agenstra comparison, AI agent platform, AI control plane, DevOps agents, self-hosted AI`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: this.page.canonicalUrl },
    ]);
  }
}
