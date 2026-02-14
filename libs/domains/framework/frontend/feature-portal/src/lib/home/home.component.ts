import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-home',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalHomeComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  ngOnInit(): void {
    this.titleService.setTitle(
      $localize`:@@featurePortalHome-metaTitle:Agenstra Platform - Centralized Control For Distributed AI Agents`,
    );
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalHome-metaDescription:Agenstra is the centralized control plane for AI agents. Orchestrate, govern, and observe distributed agent infrastructure with one platform designed for engineering teams.`,
      },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalHome-metaKeywords:Agenstra, AI agent orchestration platform, AI agent management, agent infrastructure, central control plane, enterprise AI agent governance, multi agent orchestration`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com' },
    ]);
  }
}
