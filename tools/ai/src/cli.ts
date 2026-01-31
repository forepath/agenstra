import * as fs from 'fs';
import * as path from 'path';
import { transform } from './transform';
import { listToolNames } from './transformers';
import type { ToolName } from './types';

const ALL_TARGETS: ToolName[] = ['cursor', 'opencode', 'github-copilot'];

function parseArgv(argv: string[]): {
  path: string;
  target: ToolName[];
  outputDir: string;
  dryRun: boolean;
  help: boolean;
} {
  let pathOpt = '.';
  let targetOpt: ToolName[] = [...ALL_TARGETS];
  let outputDir = '.';
  let dryRun = false;
  let help = false;

  const validTargets = listToolNames();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--path' || arg === '-p') {
      pathOpt = argv[++i] ?? pathOpt;
    } else if (arg === '--target' || arg === '-t') {
      const raw = argv[++i];
      if (raw) targetOpt = raw.split(',').map((s) => s.trim() as ToolName);
    } else if (arg === '--outputDir' || arg === '-o') {
      outputDir = argv[++i] ?? outputDir;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    }
  }

  const invalid = targetOpt.filter((t) => !validTargets.includes(t));
  if (invalid.length > 0) {
    console.error(`Invalid target(s): ${invalid.join(', ')}. Valid: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  return { path: pathOpt, target: targetOpt, outputDir, dryRun, help };
}

function printHelp(): void {
  console.log(`
agentctx - Generate tool-specific config from .agenstra context

Usage: agentctx [options]

Options:
  -p, --path <dir>     Directory that contains .agenstra/ (default: .)
  -t, --target <list>  Comma-separated targets: cursor, opencode, github-copilot (default: all)
  -o, --outputDir <dir> Base output directory for generated configs (default: .)
  --dry-run            Only validate; do not write files
  -h, --help           Show this help

Examples:
  agentctx
  agentctx --path .
  agentctx --target cursor,opencode --outputDir .
  agentctx --dry-run
`);
}

function main(): void {
  const args = parseArgv(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const cwd = process.cwd();
  const baseDir = path.resolve(cwd, args.path);
  const agenstraPath = path.join(baseDir, '.agenstra');
  const metadataPath = path.join(agenstraPath, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    console.error(
      `No .agenstra context at ${agenstraPath}. Ensure metadata.json exists. Use the example in this repo's .agenstra/ as reference.`,
    );
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(`[agenstra:context] Valid: .agenstra found at ${agenstraPath}`);
    process.exit(0);
  }

  const outputDir = path.join(baseDir, args.outputDir);
  const result = transform({
    source: baseDir,
    target: args.target,
    outputDir,
    dryRun: false,
    strictValidation: true,
    returnOutputs: false,
  });

  if (!result.success) {
    result.errors.forEach((e) => console.error(e));
    process.exit(1);
  }

  const toolOutputDir: Record<(typeof result.results)[0]['tool'], string> = {
    cursor: '.cursor',
    opencode: '.opencode',
    'github-copilot': '.github',
  };
  for (const r of result.results) {
    console.log(
      `[agenstra:context] ${r.tool}: ${r.fileCount} file(s) -> ${path.join(outputDir, toolOutputDir[r.tool])}`,
    );
  }
  process.exit(0);
}

main();
