import type { AgenstraAgent, AgenstraContext, AgenstraSubagent, ToolOutput } from '../types';
import { BaseTransformer } from './base.transformer';

const CURSOR_DIR = '.cursor';

/**
 * Escape a string for use in YAML frontmatter (double-quote and escape backslashes/quotes).
 */
function yamlEscape(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/**
 * Build Cursor rule .mdc with frontmatter (description, globs, alwaysApply).
 * Use .mdc with frontmatter for control; globs optional for "Apply to Specific Files".
 * @see https://cursor.com/docs/context/rules
 */
function ruleToMdc(name: string, content: string): string {
  const firstLine = content.trim().split('\n')[0]?.replace(/^#\s*/, '') || name;
  const description = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
  return `---
description: ${yamlEscape(description)}
globs: []
alwaysApply: false
---

${content}`;
}

/**
 * Build Cursor command as plain Markdown (description + prompt).
 * @see https://cursor.com/docs/context/commands - "plain Markdown files"
 */
function commandToMarkdown(id: string, cmd: Record<string, unknown>): string {
  const name = (cmd.name as string) ?? id;
  const desc = (cmd.description as string) ?? '';
  const prompt = (cmd.prompt as string) ?? '';
  return `# ${name}\n\n${desc ? `${desc}\n\n` : ''}${prompt || 'Run this command as described.'}\n`;
}

/**
 * Build Cursor skill as folder with SKILL.md and YAML frontmatter (name, description).
 * @see https://cursor.com/docs/context/skills - "Each skill is a folder containing a SKILL.md file"
 */
function skillToCursorSkill(name: string, content: string): string {
  const firstLine = content.trim().split('\n')[0]?.replace(/^#\s*/, '') || name;
  const description = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;
  return `---
name: ${name.replace(/\s+/g, '-').toLowerCase()}
description: ${yamlEscape(description)}
---

${content}`;
}

/**
 * Build Cursor agent/subagent as .md with YAML frontmatter (name, description) and prompt body.
 * @see https://cursor.com/docs/context/subagents
 */
function agentToCursorAgentMd(id: string, config: AgenstraAgent | AgenstraSubagent): string {
  const name = (config.name as string) ?? id;
  const description = (config.description as string) ?? '';
  const constraints = (config.constraints as string[] | undefined) ?? [];
  const body = [description, '', ...constraints.map((c) => `- ${c}`)].filter(Boolean).join('\n');
  return `---
name: ${name}
description: ${yamlEscape(description || name)}
---

${body || 'Execute tasks according to the agent configuration.'}\n`;
}

/**
 * Map .agenstra MCP definition to Cursor mcp.json entry.
 * Cursor uses a single .cursor/mcp.json with mcpServers: { "name": { command?, args?, env?, url?, headers? } }.
 * @see https://cursor.com/docs/context/mcp
 */
function toCursorMcpServerEntry(def: Record<string, unknown>): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  const command = def.command;
  const env = def.env ?? def.environment;
  const url = def.url;
  if (Array.isArray(command) && command.length > 0) {
    entry.command = command[0];
    if (command.length > 1) entry.args = command.slice(1);
  } else if (typeof command === 'string') {
    entry.command = command;
    if (def.args != null) entry.args = def.args;
  }
  if (env != null && typeof env === 'object' && !Array.isArray(env)) {
    entry.env = env;
  }
  if (typeof url === 'string') {
    entry.url = url;
    if (def.headers != null && typeof def.headers === 'object') entry.headers = def.headers;
  }
  return entry;
}

export class CursorTransformer extends BaseTransformer {
  readonly name = 'cursor' as const;

  canUseComponent(): boolean {
    return true;
  }

  transform(context: AgenstraContext): ToolOutput {
    const out = new Map<string, string>();

    for (const [name, content] of Object.entries(context.rules)) {
      if (name.startsWith('_')) continue;
      out.set(`${CURSOR_DIR}/rules/${name}.mdc`, ruleToMdc(name, content));
    }

    for (const [id, cmd] of Object.entries(context.commands)) {
      out.set(`${CURSOR_DIR}/commands/${id}.md`, commandToMarkdown(id, cmd));
    }

    for (const [name, content] of Object.entries(context.skills)) {
      out.set(`${CURSOR_DIR}/skills/${name}/SKILL.md`, skillToCursorSkill(name, content));
    }

    // Primary agents → .cursor/agents/*.md (both as markdown with frontmatter)
    for (const [id, config] of Object.entries(context.agents)) {
      out.set(`${CURSOR_DIR}/agents/${id}.md`, agentToCursorAgentMd(id, config));
    }

    // Cursor uses a single .cursor/mcp.json with mcpServers object (https://cursor.com/docs/context/mcp)
    const mcpServersObj: Record<string, Record<string, unknown>> = {};
    for (const [id, def] of Object.entries(context.mcpDefinitions)) {
      const entry = toCursorMcpServerEntry(def as Record<string, unknown>);
      if (Object.keys(entry).length > 0) {
        mcpServersObj[id] = entry;
      }
    }
    out.set(`${CURSOR_DIR}/mcp.json`, JSON.stringify({ mcpServers: mcpServersObj }, null, 2));

    return out;
  }
}
