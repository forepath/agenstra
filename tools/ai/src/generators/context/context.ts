import { formatFiles, getProjects, joinPathFragments, Tree } from '@nx/devkit';
import * as path from 'path';
import { transform } from '../../transform';
import { ContextGeneratorSchema } from './schema';

/**
 * Resolve the directory that contains (or would contain) .agenstra/.
 */
function resolveBaseDir(tree: Tree, options: ContextGeneratorSchema): string {
  if (options.project) {
    const projects = getProjects(tree);
    const config = projects.get(options.project);
    if (!config) {
      throw new Error(`Project "${options.project}" not found in workspace.`);
    }
    return config.root;
  }
  const pathOption = options.path ?? '.';
  return pathOption.endsWith('.agenstra') ? pathOption.replace(/\.agenstra\/?$/, '') : pathOption;
}

/**
 * Context generator: validates that .agenstra/ exists and optionally runs the transformer
 * to emit tool-specific configs (Cursor, OpenCode, GitHub Copilot) into the tree.
 */
export async function contextGenerator(tree: Tree, options: ContextGeneratorSchema): Promise<void> {
  const baseDir = resolveBaseDir(tree, options);
  const agenstraRoot = joinPathFragments(baseDir, '.agenstra');
  const schemaPath = joinPathFragments(agenstraRoot, 'schema-version.txt');
  const metadataPath = joinPathFragments(agenstraRoot, 'metadata.json');

  if (!tree.exists(schemaPath) || !tree.exists(metadataPath)) {
    throw new Error(
      `No .agenstra context at ${agenstraRoot}. Ensure schema-version.txt and metadata.json exist. Use the example in this repo's .agenstra/ as reference.`,
    );
  }

  if (options.dryRun === true) {
    console.log(`[agenstra:context] Valid: .agenstra found at ${agenstraRoot}`);
    return;
  }

  const targets = options.target;
  if (targets != null && targets.length > 0) {
    const workspaceRoot = process.cwd();
    const sourcePath = path.join(workspaceRoot, baseDir);
    const outputDir = options.outputDir ?? 'generated';
    const result = transform({
      source: sourcePath,
      target: targets,
      outputDir: joinPathFragments(baseDir, outputDir),
      dryRun: false,
      strictValidation: true,
      returnOutputs: true,
    });

    if (!result.success) {
      throw new Error(`Transform failed: ${result.errors.join('; ')}`);
    }

    const outputBase = joinPathFragments(baseDir, outputDir);
    for (const r of result.results) {
      if (r.output) {
        for (const [relPath, content] of r.output) {
          const treePath = joinPathFragments(outputBase, r.tool, relPath);
          tree.write(treePath, content);
        }
      }
    }

    await formatFiles(tree);
  }
}

export default contextGenerator;
