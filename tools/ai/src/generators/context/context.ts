import { formatFiles, getProjects, joinPathFragments, Tree } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { transform } from '../../transform';
import type { ToolName } from '../../types';
import { ContextGeneratorSchema } from './schema';

const ALL_TARGETS: ToolName[] = ['cursor', 'opencode', 'github-copilot'];

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
  const metadataPath = joinPathFragments(agenstraRoot, 'metadata.json');

  if (!tree.exists(metadataPath)) {
    throw new Error(
      `No .agenstra context at ${agenstraRoot}. Ensure metadata.json exists with version and appName. Use the example in this repo's .agenstra/ as reference.`,
    );
  }

  if (options.dryRun === true) {
    console.log(`[agenstra:context] Valid: .agenstra found at ${agenstraRoot}`);
    return;
  }

  const targets: ToolName[] = options.target != null && options.target.length > 0 ? options.target : ALL_TARGETS;

  {
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
    const agenstraPath = path.join(workspaceRoot, baseDir, '.agenstra');
    for (const r of result.results) {
      if (r.output) {
        for (const [relPath, content] of r.output) {
          const treePath = joinPathFragments(outputBase, relPath);
          tree.write(treePath, content);
        }
      }
      // Copy overrides last so they can overwrite auto-generated content
      copyOverridesToTree(tree, agenstraPath, r.tool, outputBase);
    }

    // Skip formatting in test environments (Jest doesn't support ES Modules in VM API required by Prettier)
    const isTestEnv = process.env.NODE_ENV === 'test' || typeof (globalThis as { jest?: unknown }).jest !== 'undefined';
    if (!isTestEnv) {
      await formatFiles(tree);
    }
  }
}

/**
 * Copy override files from .agenstra/overrides/ to the tree (for generator use).
 * Overrides are copied last so they can overwrite auto-generated content.
 */
function copyOverridesToTree(tree: Tree, agenstraDir: string, toolName: ToolName, outputBase: string): void {
  const overridesDir = path.join(agenstraDir, 'overrides');
  if (!fs.existsSync(overridesDir) || !fs.statSync(overridesDir).isDirectory()) {
    return;
  }

  const overridePaths: Record<ToolName, string[]> = {
    cursor: ['.cursor'],
    opencode: ['.opencode', 'AGENTS.md', 'opencode.json'],
    'github-copilot': ['.github'],
  };

  const pathsToCopy = overridePaths[toolName] || [];
  for (const overridePath of pathsToCopy) {
    const sourcePath = path.join(overridesDir, overridePath);
    if (!fs.existsSync(sourcePath)) continue;

    if (fs.statSync(sourcePath).isFile()) {
      const targetPath = joinPathFragments(outputBase, overridePath);
      const content = fs.readFileSync(sourcePath, 'utf-8');
      tree.write(targetPath, content);
    } else if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectoryToTreeRecursive(tree, sourcePath, joinPathFragments(outputBase, overridePath));
    }
  }
}

function copyDirectoryToTreeRecursive(tree: Tree, source: string, targetBase: string): void {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = joinPathFragments(targetBase, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryToTreeRecursive(tree, sourcePath, targetPath);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(sourcePath, 'utf-8');
      tree.write(targetPath, content);
    }
  }
}

export default contextGenerator;
