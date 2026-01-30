import * as path from 'path';
import { copyOverrides, emitToolOutput } from './emitter';
import { readContext } from './reader';
import { getTransformer, mergeComponentsForTransformer } from './transformers';
import type { ToolName, ToolOutput } from './types';
import { validateContext } from './validator';

export interface TransformOptions {
  /** Path to .agenstra directory (or directory containing .agenstra). */
  source: string;
  /** One or more target tools. */
  target: ToolName | ToolName[];
  /** Base directory for output (e.g. outputDir/.cursor/, outputDir/.opencode/, outputDir/.github/). Default: ./generated */
  outputDir?: string;
  /** If true, do not write files; return results only. */
  dryRun?: boolean;
  /** If true, fail on validation errors. Default: true */
  strictValidation?: boolean;
  /** If true, do not emit to disk; include each result's output map for use by callers (e.g. Nx Tree). */
  returnOutputs?: boolean;
}

export interface TransformResult {
  success: boolean;
  results: Array<{
    tool: ToolName;
    path: string;
    fileCount: number;
    merged?: string[];
    /** Present when returnOutputs was true. */
    output?: ToolOutput;
  }>;
  errors: string[];
}

/**
 * Read .agenstra context, validate, transform to target tool(s), and optionally emit files.
 */
export function transform(options: TransformOptions): TransformResult {
  const {
    source,
    target,
    outputDir = 'generated',
    dryRun = false,
    strictValidation = true,
    returnOutputs = false,
  } = options;

  const errors: string[] = [];
  const results: TransformResult['results'] = [];
  const agenstraPath = source.endsWith('.agenstra') ? source : path.join(source, '.agenstra');

  let context;
  try {
    context = readContext(agenstraPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
    return { success: false, results: [], errors };
  }

  const validation = validateContext(context);
  const hasErrors = validation.some((v) => v.level === 'error');
  if (hasErrors && strictValidation) {
    validation.filter((v) => v.level === 'error').forEach((v) => errors.push(v.message));
    return { success: false, results: [], errors };
  }

  const targets = Array.isArray(target) ? target : [target];
  const baseOut = path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir);

  for (const toolName of targets) {
    const transformer = getTransformer(toolName);
    const mergedContext = mergeComponentsForTransformer({ ...context }, transformer);
    const output = transformer.transform(mergedContext);
    const fileCount = output.size;

    const merged = transformer.needsFallbackMerge();
    const resultEntry: TransformResult['results'][0] = {
      tool: toolName,
      path: baseOut,
      fileCount,
      merged: merged.length > 0 ? merged : undefined,
    };
    if (returnOutputs) {
      resultEntry.output = output;
    }
    results.push(resultEntry);

    if (!dryRun && !returnOutputs && fileCount > 0) {
      try {
        emitToolOutput(baseOut, output);
        // Copy overrides last so they can overwrite auto-generated content
        copyOverrides(agenstraPath, toolName, baseOut);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to write ${toolName} output: ${msg}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}
