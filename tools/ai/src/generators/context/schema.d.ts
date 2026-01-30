import type { ToolName } from '../../types';

export interface ContextGeneratorSchema {
  /** Nx project name. .agenstra/ is expected at the project root. */
  project?: string;
  /** Directory that contains .agenstra/. Used when project is not set. */
  path?: string;
  /** Target tools to generate config for. When provided, runs the transformer and writes output under outputDir. */
  target?: ToolName[];
  /** Base output directory for transformed configs. Each tool gets a subdir. */
  outputDir?: string;
  /** Only validate; do not run transform or write files. */
  dryRun?: boolean;
}
