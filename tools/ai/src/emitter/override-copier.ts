import * as fs from 'fs';
import * as path from 'path';
import type { ToolName } from '../types';

/**
 * Copy override files from .agenstra/overrides/ to the tool output directory.
 * Overrides are copied last so they can overwrite auto-generated content.
 *
 * Override structure (mirrors output structure):
 * - `.agenstra/overrides/.cursor/...` → `outputDir/.cursor/...`
 * - `.agenstra/overrides/.opencode/...` → `outputDir/.opencode/...`
 * - `.agenstra/overrides/AGENTS.md` → `outputDir/AGENTS.md`
 * - `.agenstra/overrides/opencode.json` → `outputDir/opencode.json`
 * - `.agenstra/overrides/.github/...` → `outputDir/.github/...`
 *
 * Both the transform (CLI/executor) and the generator write directly to outputDir with these paths.
 *
 * @param agenstraDir - Path to .agenstra directory
 * @param toolName - Target tool name
 * @param outputDir - Base output directory (e.g. generated, or generated/cursor if per-tool)
 */
export function copyOverrides(agenstraDir: string, toolName: ToolName, outputDir: string): void {
  const overridesDir = path.join(agenstraDir, 'overrides');
  if (!fs.existsSync(overridesDir) || !fs.statSync(overridesDir).isDirectory()) {
    return;
  }

  const root = path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir);

  // Map tool names to override source paths (mirrors transformer output paths)
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
      // Single file override (e.g. AGENTS.md, opencode.json)
      const targetPath = path.join(root, overridePath);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(sourcePath, targetPath);
    } else if (fs.statSync(sourcePath).isDirectory()) {
      // Directory override (e.g. .cursor/, .opencode/, .github/)
      copyDirectoryRecursive(sourcePath, path.join(root, overridePath));
    }
  }
}

/**
 * Recursively copy a directory tree.
 */
function copyDirectoryRecursive(source: string, target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}
