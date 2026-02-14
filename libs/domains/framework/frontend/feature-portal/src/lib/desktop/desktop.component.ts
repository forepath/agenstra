import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-desktop',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./desktop.component.scss'],
  templateUrl: './desktop.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalDesktopComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  ngOnInit(): void {
    this.titleService.setTitle(
      $localize`:@@featurePortalDesktop-metaTitle:Agenstra Desktop - Local Control Center For Your AI Agents`,
    );
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalDesktop-metaDescription:Agenstra Desktop gives developers a secure local control center for connecting to Agenstra, inspecting agents, and working with context in their daily workflow.`,
      },
      {
        name: 'keywords',
        content:
          'Agenstra Desktop, AI agent desktop app, desktop client for AI agent management, local interface for AI agent orchestration, developer desktop app',
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com/desktop' },
    ]);
  }
}
