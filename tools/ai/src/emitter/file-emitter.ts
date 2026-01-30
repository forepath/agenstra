import * as fs from 'fs';
import * as path from 'path';
import type { ToolOutput } from '../types';

/**
 * Write tool output to a directory. Each key in output is a relative path; value is file content.
 * @param outputDir - Base directory (e.g. generated/cursor)
 * @param output - Map of relative path -> content (string or Buffer)
 */
export function emitToolOutput(outputDir: string, output: ToolOutput): void {
  const root = path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir);
  for (const [relPath, content] of output) {
    const full = path.join(root, relPath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = typeof content === 'string' ? content : content;
    fs.writeFileSync(full, data, typeof content === 'string' ? 'utf-8' : undefined);
  }
}
