import type { AgenstraContext, ComponentType, ToolOutput } from '../types';
import { BaseTransformer } from './base.transformer';

const GITHUB_DIR = '.github';

/**
 * Path-specific instructions: NAME.instructions.md with frontmatter applyTo (glob).
 * applyTo uses glob syntax; "**" = all files. Optional excludeAgent: "code-review" | "coding-agent".
 * @see https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
 */
function withApplyToFrontmatter(content: string, applyTo = '**'): string {
  const escaped = applyTo.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `---
applyTo: "${escaped}"
---

${content}`;
}

export class GithubCopilotTransformer extends BaseTransformer {
  readonly name = 'github-copilot' as const;

  canUseComponent(component: ComponentType): boolean {
    return component !== 'skills';
  }

  needsFallbackMerge(): ComponentType[] {
    return ['skills'];
  }

  transform(context: AgenstraContext): ToolOutput {
    const out = new Map<string, string>();

    const mainInstructions = buildCopilotInstructions(context);
    out.set(`${GITHUB_DIR}/copilot-instructions.md`, mainInstructions);

    if (context.rules['_merged_skills']) {
      out.set(
        `${GITHUB_DIR}/instructions/skills.instructions.md`,
        withApplyToFrontmatter(context.rules['_merged_skills']),
      );
    }

    const agentsContent = buildAgentsFallback(context);
    out.set(`${GITHUB_DIR}/instructions/agents.instructions.md`, withApplyToFrontmatter(agentsContent));

    return out;
  }
}

function buildCopilotInstructions(context: AgenstraContext): string {
  const parts: string[] = ['# Repository instructions\n', 'Generated from .agenstra context.\n\n'];

  for (const [name, content] of Object.entries(context.rules)) {
    if (name.startsWith('_')) continue;
    parts.push(`## ${name}\n\n`, content, '\n\n');
  }

  return parts.join('');
}

/** GitHub Copilot does not support subagents; emit only primary agents. */
function buildAgentsFallback(context: AgenstraContext): string {
  const lines = ['# Agents\n'];
  for (const [id, a] of Object.entries(context.agents)) {
    lines.push(`## ${(a as { name?: string }).name ?? id}\n**ID:** ${id}\n`);
  }
  return lines.join('\n');
}
