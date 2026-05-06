import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const EMPTY_SHA256_HEX = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export interface IntegrityArtifact {
  readonly relativePath: string;
  readonly sha256Hex: string;
}

export interface IntegrityManifestJson {
  readonly schemaVersion: 1;
  readonly algorithm: 'sha256';
  readonly root: '.';
  readonly generatedAt: string;
  readonly artifacts: readonly IntegrityArtifact[];
}

export function sha256HexOfBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * GNU `sha256sum` text format: `<hex>  <relativePath>` (two spaces).
 */
export function formatSha256SumLine(sha256Hex: string, relativePath: string): string {
  return `${sha256Hex}  ${relativePath}`;
}

export function formatSha256SumsFile(artifacts: readonly IntegrityArtifact[]): string {
  const sorted = [...artifacts].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const lines = sorted.map((a) => formatSha256SumLine(a.sha256Hex, a.relativePath));

  return `${lines.join('\n')}\n`;
}

/**
 * Parses GNU-style `sha256sum` output (two spaces or space-star before path).
 */
export function parseSha256SumsFileContent(content: string): IntegrityArtifact[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const out: IntegrityArtifact[] = [];

  for (const line of lines) {
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);

    if (!match) {
      throw new Error(`Invalid sha256sum line: ${line}`);
    }

    out.push({ relativePath: match[2], sha256Hex: match[1] });
  }

  return out;
}

export function normalizeManifestRelativePath(fileAbs: string, rootAbs: string): string {
  const rel = path.relative(rootAbs, fileAbs);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes root: ${fileAbs}`);
  }

  return rel.split(path.sep).join('/');
}

export async function listFilesRecursive(rootAbs: string): Promise<string[]> {
  const entries = await fs.promises.readdir(rootAbs, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(rootAbs, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

export async function hashFileSha256Hex(fileAbs: string): Promise<string> {
  const buf = await fs.promises.readFile(fileAbs);

  return sha256HexOfBuffer(buf);
}

export async function buildIntegrityArtifactsForDirectory(rootAbs: string): Promise<IntegrityArtifact[]> {
  const stat = await fs.promises.stat(rootAbs);

  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${rootAbs}`);
  }

  const absoluteFiles = await listFilesRecursive(rootAbs);
  const artifacts: IntegrityArtifact[] = [];

  for (const abs of absoluteFiles) {
    const base = path.basename(abs);

    if (base === 'SHA256SUMS' || base === 'integrity-manifest.json') {
      continue;
    }

    const relativePath = normalizeManifestRelativePath(abs, rootAbs);
    const sha256Hex = await hashFileSha256Hex(abs);

    artifacts.push({ relativePath, sha256Hex });
  }

  return artifacts;
}

export function buildIntegrityManifestJson(artifacts: readonly IntegrityArtifact[]): IntegrityManifestJson {
  const sorted = [...artifacts].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    schemaVersion: 1,
    algorithm: 'sha256',
    root: '.',
    generatedAt: new Date().toISOString(),
    artifacts: sorted,
  };
}

export async function writeIntegrityFiles(
  rootAbs: string,
  artifacts: readonly IntegrityArtifact[],
): Promise<{ sumsPath: string; jsonPath: string }> {
  const sumsContent = formatSha256SumsFile(artifacts);
  const jsonContent = `${JSON.stringify(buildIntegrityManifestJson(artifacts), null, 2)}\n`;
  const sumsPath = path.join(rootAbs, 'SHA256SUMS');
  const jsonPath = path.join(rootAbs, 'integrity-manifest.json');

  await fs.promises.writeFile(sumsPath, sumsContent, 'utf-8');
  await fs.promises.writeFile(jsonPath, jsonContent, 'utf-8');

  return { sumsPath, jsonPath };
}
