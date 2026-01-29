import type { ToolName } from '../types';
import type { BaseTransformer } from './base.transformer';
import { CursorTransformer } from './cursor.transformer';
import { GithubCopilotTransformer } from './github-copilot.transformer';
import { OpenCodeTransformer } from './opencode.transformer';

export { BaseTransformer } from './base.transformer';
export { CursorTransformer } from './cursor.transformer';
export { mergeComponentsForTransformer } from './fallback-merger';
export { GithubCopilotTransformer } from './github-copilot.transformer';
export { OpenCodeTransformer } from './opencode.transformer';

const transformers: Record<ToolName, BaseTransformer> = {
  cursor: new CursorTransformer(),
  opencode: new OpenCodeTransformer(),
  'github-copilot': new GithubCopilotTransformer(),
};

export function getTransformer(name: ToolName): BaseTransformer {
  const t = transformers[name];
  if (!t) throw new Error(`Unknown tool: ${name}. Supported: ${listToolNames().join(', ')}`);
  return t;
}

export function listToolNames(): ToolName[] {
  return Object.keys(transformers) as ToolName[];
}
