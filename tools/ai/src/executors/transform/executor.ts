import type { ExecutorContext } from '@nx/devkit';
import * as path from 'path';
import { transform as runTransform } from '../../transform';
import type { ToolName } from '../../types';

export interface TransformExecutorSchema {
  source?: string;
  target: ToolName | ToolName[];
  outputDir?: string;
  dryRun?: boolean;
}

export default async function transformExecutor(
  options: TransformExecutorSchema,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const workspaceRoot = context.root ?? process.cwd();
  const sourceDir = options.source ?? workspaceRoot;
  const agenstraDir = sourceDir.endsWith('.agenstra') ? sourceDir : path.join(sourceDir, '.agenstra');
  const absoluteSource = path.isAbsolute(agenstraDir) ? agenstraDir : path.join(workspaceRoot, agenstraDir);
  const targets = Array.isArray(options.target) ? options.target : [options.target];
  const outputDir = options.outputDir ?? 'generated';
  const absoluteOutput = path.isAbsolute(outputDir) ? outputDir : path.join(workspaceRoot, outputDir);
  const result = runTransform({
    source: absoluteSource,
    target: targets as ToolName[],
    outputDir: absoluteOutput,
    dryRun: options.dryRun ?? false,
    strictValidation: true,
  });

  if (!result.success && result.errors.length > 0) {
    console.error('Transform failed:', result.errors.join('; '));
    return { success: false };
  }

  result.results.forEach((r) => {
    console.log(
      `[agenstra] ${r.tool}: ${r.fileCount} file(s) → ${r.path}${r.merged?.length ? ` (merged: ${r.merged.join(', ')})` : ''}`,
    );
  });
  return { success: result.success };
}
