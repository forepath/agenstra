/**
 * Component types in the Agenstra context that can be merged as fallback.
 */
export type ComponentType = 'rules' | 'commands' | 'skills' | 'agents' | 'subagents' | 'mcp';

/**
 * Supported tool targets for transformation.
 */
export type ToolName = 'cursor' | 'opencode' | 'github-copilot';

/**
 * Output for a single tool: map of output file path (relative to tool output dir) to content.
 */
export type ToolOutput = Map<string, string | Buffer>;

/**
 * Result of transforming to one tool.
 */
export interface ToolTransformResult {
  tool: ToolName;
  files: ToolOutput;
  report?: TransformationReport;
}

export interface TransformationReport {
  mergedComponents?: ComponentType[];
  filesWritten: number;
}
