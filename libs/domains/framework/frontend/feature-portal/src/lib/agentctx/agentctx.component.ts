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
    this.titleService.setTitle('AgentCTX - One context, all your AI coding tools');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'AgentCTX generates tool-specific config from a single context. One source of truth for all your AI coding tools. Install with one command and run agentctx to get started.',
      },
      {
        name: 'keywords',
        content:
          'AgentCTX, agentctx, .agenstra, AI coding tools, Cursor, OpenCode, GitHub Copilot, agent context, rules, commands, skills, MCP, single source of truth',
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
