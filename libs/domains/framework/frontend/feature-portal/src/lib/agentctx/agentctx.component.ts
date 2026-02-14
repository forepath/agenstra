import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-agentctx',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./agentctx.component.scss'],
  templateUrl: './agentctx.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalAgentCtxComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  readonly installCommand = 'curl -fsSL https://downloads.agenstra.com/agentctx/install.sh | bash';
  readonly runCommand = 'agentctx';
  copyInstallFeedback = false;
  copyRunFeedback = false;

  ngOnInit(): void {
    this.titleService.setTitle(
      $localize`:@@featurePortalAgentctx-metaTitle:AgentCTX - One Context For All Your AI Coding Tools`,
    );
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalAgentctx-metaDescription:AgentCTX generates tool specific configuration from a single shared context. Keep Claude, Cursor, GitHub Copilot, and other AI coding tools aligned with one source of truth.`,
      },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalAgentctx-metaKeywords:AgentCTX, agentctx, .agenstra, AI coding tools, Cursor, OpenCode, GitHub Copilot, agent context, rules, commands, skills, MCP, single source of truth`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com/agentctx' },
    ]);
  }

  copyInstallCommand() {
    this.copyInstallFeedback = true;
    navigator.clipboard.writeText(this.installCommand);
  }

  copyRunCommand() {
    this.copyRunFeedback = true;
    navigator.clipboard.writeText(this.runCommand);
  }
}
