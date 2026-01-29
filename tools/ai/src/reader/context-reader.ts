import * as fs from 'fs';
import * as path from 'path';
import type { AgenstraContext, AgenstraMetadata } from '../types';

function readFileSafe(dir: string, file: string): string | null {
  const full = path.join(dir, file);
  try {
    return fs.readFileSync(full, 'utf-8');
  } catch {
    return null;
  }
}

function readJsonSafe<T>(dir: string, file: string): T | null {
  const content = readFileSafe(dir, file);
  if (content == null) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Read .agenstra/ directory from the filesystem into an AgenstraContext.
 * @param agenstraDir - Absolute or relative path to the .agenstra directory
 */
export function readContext(agenstraDir: string): AgenstraContext {
  const root = path.isAbsolute(agenstraDir) ? agenstraDir : path.resolve(process.cwd(), agenstraDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Not a directory: ${root}`);
  }

  const metadataJson = readJsonSafe<AgenstraMetadata>(root, 'metadata.json');
  if (!metadataJson || !metadataJson.version || !metadataJson.appName) {
    throw new Error(`${root}/metadata.json must exist and contain version and appName`);
  }

  const rules: Record<string, string> = {};
  const rulesDir = path.join(root, 'rules');
  if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
    for (const f of fs.readdirSync(rulesDir)) {
      if (f.endsWith('.md')) {
        const content = readFileSafe(rulesDir, f);
        if (content != null) rules[f.replace(/\.md$/, '')] = content;
      }
    }
  }

  const commands: Record<string, Record<string, unknown>> = {};
  const commandsDir = path.join(root, 'commands');
  if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
    for (const f of fs.readdirSync(commandsDir)) {
      if (f.endsWith('.command.json')) {
        const content = readJsonSafe<Record<string, unknown>>(commandsDir, f);
        if (content != null) {
          const id = (content.id as string) ?? f.replace(/\.command\.json$/, '');
          commands[id] = content;
        }
      }
    }
  }

  const skills: Record<string, string> = {};
  const skillsDir = path.join(root, 'skills');
  if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
    for (const f of fs.readdirSync(skillsDir)) {
      if (f.endsWith('.skill.md')) {
        const content = readFileSafe(skillsDir, f);
        if (content != null) skills[f.replace(/\.skill\.md$/, '')] = content;
      }
    }
  }

  // Key by filename stem so architect.agent.json → architect, output architect.md
  const agents: Record<string, Record<string, unknown>> = {};
  const agentsDir = path.join(root, 'agents');
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.endsWith('.agent.json')) {
        const content = readJsonSafe<Record<string, unknown>>(agentsDir, f);
        if (content != null) {
          const key = f.replace(/\.agent\.json$/, '');
          agents[key] = content as import('../types').AgenstraAgent;
        }
      }
    }
  }

  const subagents: Record<string, Record<string, unknown>> = {};
  const subagentsDir = path.join(root, 'subagents');
  if (fs.existsSync(subagentsDir) && fs.statSync(subagentsDir).isDirectory()) {
    for (const f of fs.readdirSync(subagentsDir)) {
      if (f.endsWith('.subagent.json')) {
        const content = readJsonSafe<Record<string, unknown>>(subagentsDir, f);
        if (content != null) {
          const key = f.replace(/\.subagent\.json$/, '');
          subagents[key] = content as import('../types').AgenstraSubagent;
        }
      }
    }
  }

  const mcpDefinitions: Record<string, Record<string, unknown>> = {};
  const mcpDir = path.join(root, 'mcp-definitions');
  if (fs.existsSync(mcpDir) && fs.statSync(mcpDir).isDirectory()) {
    for (const f of fs.readdirSync(mcpDir)) {
      if (f.endsWith('.mcp.json')) {
        const content = readJsonSafe<Record<string, unknown>>(mcpDir, f);
        if (content != null) {
          const id = (content.id as string) ?? f.replace(/\.mcp\.json$/, '');
          mcpDefinitions[id] = content;
        }
      }
    }
  }

  return {
    metadata: metadataJson,
    rules,
    commands,
    skills,
    agents: agents as import('../types').AgenstraContext['agents'],
    subagents: subagents as import('../types').AgenstraContext['subagents'],
    mcpDefinitions,
  };
}
