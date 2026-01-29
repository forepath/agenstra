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

function agentBody(config: { description?: string; constraints?: string[] }): string {
  const description = config.description ?? '';
  const constraints = config.constraints ?? [];
  const body = [description, '', ...constraints.map((c) => `- ${c}`)].filter(Boolean).join('\n');
  return body || '';
}

/** GitHub Copilot does not support subagents; emit only primary agents. */
function buildAgentsFallback(context: AgenstraContext): string {
  const lines = ['# Agents\n'];
  for (const [id, a] of Object.entries(context.agents)) {
    const config = a as { name?: string; description?: string; constraints?: string[] };
    const name = config.name ?? id;
    lines.push(`## ${name}\n\n**ID:** ${id}\n\n`);
    const body = agentBody(config);
    if (body) lines.push(body, '\n\n');
  }
  lines.push('\n');
  lines.push('# Subagents\n');
  for (const [id, a] of Object.entries(context.subagents)) {
    const config = a as { name?: string; description?: string; constraints?: string[] };
    const name = config.name ?? id;
    lines.push(`## ${name} (subagent)\n\n**ID:** ${id}\n\n`);
    const body = agentBody(config);
    if (body) lines.push(body, '\n\n');
  }
  return lines.join('\n');
}
