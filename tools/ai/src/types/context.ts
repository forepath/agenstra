import type { AgenstraAgent } from './agent';
import type { AgenstraMetadata } from './metadata';
import type { AgenstraSubagent } from './subagent';

/** Rule entry: body content plus optional metadata (id, name, description, globs, alwaysApply). */
export interface RuleEntry {
  content: string;
  id?: string;
  name?: string;
  description?: string;
  /** Glob patterns for file/path scope. Cursor: "Apply to Specific Files"; GitHub Copilot: path-specific instructions (applyTo derived from globs). */
  globs?: string[];
  /** When true, rule is always applied (Cursor: "Always Apply"). When true, globs is inferred as ['**'] so GitHub Copilot treats it as repository-wide. */
  alwaysApply?: boolean;
}

/** Skill entry: body content plus optional metadata (id, name, description). */
export interface SkillEntry {
  content: string;
  id?: string;
  name?: string;
  description?: string;
}

/**
 * In-memory representation of .agenstra/ context.
 */
export interface AgenstraContext {
  metadata: AgenstraMetadata;
  /** Rule key (filename stem) -> entry (content + optional id, name, description). _merged_skills may be string. */
  rules: Record<string, string | RuleEntry>;
  /** Command id/filename -> parsed JSON */
  commands: Record<string, Record<string, unknown>>;
  /** Skill key (filename stem) -> entry (content + optional id, name, description) */
  skills: Record<string, SkillEntry>;
  /** Agent id -> config */
  agents: Record<string, AgenstraAgent>;
  /** Subagent id -> config */
  subagents: Record<string, AgenstraSubagent>;
  /** MCP definition id/filename -> parsed JSON */
  mcpDefinitions: Record<string, Record<string, unknown>>;
}
