import * as fs from 'fs';
import * as path from 'path';

import { buildIntegrityArtifactsForDirectory, writeIntegrityFiles } from './lib/sha256-manifest';

function parseArgs(argv: string[]): { input: string } {
  let input = '';

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--input' && argv[i + 1]) {
      input = argv[i + 1];
      i++;
    }
  }

  if (!input) {
    input = process.env.RELEASE_INTEGRITY_INPUT ?? process.env.DESKTOP_RELEASE_INTEGRITY_INPUT ?? 'out/make';
  }

  return { input };
}

async function main(): Promise<void> {
  const { input } = parseArgs(process.argv);
  const rootAbs = path.resolve(process.cwd(), input);

  if (!fs.existsSync(rootAbs)) {
    throw new Error(`Input path does not exist: ${rootAbs}`);
  }

  const artifacts = await buildIntegrityArtifactsForDirectory(rootAbs);

  if (artifacts.length === 0) {
    throw new Error(`No artifacts found under ${rootAbs}; run electron-forge make first.`);
  }

  const { sumsPath, jsonPath } = await writeIntegrityFiles(rootAbs, artifacts);

  // eslint-disable-next-line no-console
  console.log(`Wrote ${artifacts.length} entries to ${sumsPath} and ${jsonPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);

  // eslint-disable-next-line no-console
  console.error(message);
  process.exitCode = 1;
});
