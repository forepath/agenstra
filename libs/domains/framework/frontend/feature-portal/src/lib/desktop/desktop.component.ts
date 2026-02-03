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
    this.titleService.setTitle('Agenstra Desktop - Native app for AI agent management');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Agenstra Desktop is the native application for the Agenstra console. Full IDE, chat, file management, and agent control - packaged for Windows, macOS, and Linux. No browser required.',
      },
      {
        name: 'keywords',
        content:
          'Agenstra Desktop, Agenstra, native app, desktop application, AI agent management, Electron, Windows, macOS, Linux, agent console, IDE',
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com/desktop' },
    ]);
  }
}
