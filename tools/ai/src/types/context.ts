import type { AgenstraAgent } from './agent';
import type { AgenstraMetadata } from './metadata';
import type { AgenstraSubagent } from './subagent';

/**
 * In-memory representation of .agenstra/ context.
 */
export interface AgenstraContext {
  metadata: AgenstraMetadata;
  /** Rule name (filename without path) -> content */
  rules: Record<string, string>;
  /** Command id/filename -> parsed JSON */
  commands: Record<string, Record<string, unknown>>;
  /** Skill name -> content */
  skills: Record<string, string>;
  /** Agent id -> config */
  agents: Record<string, AgenstraAgent>;
  /** Subagent id -> config */
  subagents: Record<string, AgenstraSubagent>;
  /** MCP definition id/filename -> parsed JSON */
  mcpDefinitions: Record<string, Record<string, unknown>>;
}
