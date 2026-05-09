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

function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * Validates and parses `integrity-manifest.json` body (same shape as {@link buildIntegrityManifestJson} output).
 */
export function parseIntegrityManifestJsonContent(content: string): IntegrityManifestJson {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new Error('integrity-manifest.json is not valid JSON');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('integrity-manifest.json must be a JSON object');
  }

  const rec = parsed as Record<string, unknown>;

  if (rec['schemaVersion'] !== 1) {
    throw new Error('integrity-manifest.json schemaVersion must be 1');
  }

  if (rec['algorithm'] !== 'sha256') {
    throw new Error('integrity-manifest.json algorithm must be "sha256"');
  }

  if (rec['root'] !== undefined && rec['root'] !== '.') {
    throw new Error('integrity-manifest.json root must be "." if present');
  }

  const artifactsRaw = rec['artifacts'];

  if (!Array.isArray(artifactsRaw)) {
    throw new Error('integrity-manifest.json must contain an artifacts array');
  }

  const artifacts: IntegrityArtifact[] = [];

  for (const item of artifactsRaw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('integrity-manifest.json artifacts must be objects');
    }

    const a = item as Record<string, unknown>;
    const relativePath = a['relativePath'];
    const sha256Hex = a['sha256Hex'];

    if (typeof relativePath !== 'string' || relativePath.length === 0) {
      throw new Error('integrity-manifest.json artifact missing relativePath');
    }

    if (typeof sha256Hex !== 'string' || !isHex64(sha256Hex)) {
      throw new Error(`integrity-manifest.json artifact has invalid sha256Hex for ${relativePath}`);
    }

    artifacts.push({ relativePath, sha256Hex });
  }

  const generatedAt = typeof rec['generatedAt'] === 'string' ? rec['generatedAt'] : '';

  return {
    schemaVersion: 1,
    algorithm: 'sha256',
    root: '.',
    generatedAt,
    artifacts,
  };
}

export type IntegrityManifestSource = 'auto' | 'sums' | 'json';

export interface VerifyIntegrityResult {
  readonly ok: boolean;
  readonly verifiedCount: number;
  readonly errors: readonly string[];
}

/**
 * Loads expected digests from `SHA256SUMS` or `integrity-manifest.json` under {@param rootAbs}.
 */
export async function readExpectedArtifactsFromRoot(
  rootAbs: string,
  source: IntegrityManifestSource = 'auto',
): Promise<{ artifacts: IntegrityArtifact[]; used: 'sums' | 'json' }> {
  const sumsPath = path.join(rootAbs, 'SHA256SUMS');
  const jsonPath = path.join(rootAbs, 'integrity-manifest.json');
  const hasSums = fs.existsSync(sumsPath);
  const hasJson = fs.existsSync(jsonPath);

  if (source === 'sums') {
    if (!hasSums) {
      throw new Error(`SHA256SUMS not found under ${rootAbs}`);
    }

    const text = await fs.promises.readFile(sumsPath, 'utf-8');

    return { artifacts: parseSha256SumsFileContent(text), used: 'sums' };
  }

  if (source === 'json') {
    if (!hasJson) {
      throw new Error(`integrity-manifest.json not found under ${rootAbs}`);
    }

    const text = await fs.promises.readFile(jsonPath, 'utf-8');

    return { artifacts: [...parseIntegrityManifestJsonContent(text).artifacts], used: 'json' };
  }

  if (hasSums) {
    const text = await fs.promises.readFile(sumsPath, 'utf-8');

    return { artifacts: parseSha256SumsFileContent(text), used: 'sums' };
  }

  if (hasJson) {
    const text = await fs.promises.readFile(jsonPath, 'utf-8');

    return { artifacts: [...parseIntegrityManifestJsonContent(text).artifacts], used: 'json' };
  }

  throw new Error(`Neither SHA256SUMS nor integrity-manifest.json found under ${rootAbs}`);
}

/**
 * Checks that each expected file exists under {@param rootAbs} and matches its SHA-256 digest.
 */
export async function verifyArtifactsAgainstDirectory(
  rootAbs: string,
  expected: readonly IntegrityArtifact[],
): Promise<VerifyIntegrityResult> {
  const errors: string[] = [];
  const stat = await fs.promises.stat(rootAbs);

  if (!stat.isDirectory()) {
    return { ok: false, verifiedCount: 0, errors: [`Not a directory: ${rootAbs}`] };
  }

  if (expected.length === 0) {
    return { ok: false, verifiedCount: 0, errors: ['Manifest contains no file entries'] };
  }

  const sorted = [...expected].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  let verifiedCount = 0;

  for (const entry of sorted) {
    const fileAbs = path.join(rootAbs, ...entry.relativePath.split('/'));

    try {
      const normalized = normalizeManifestRelativePath(fileAbs, rootAbs);

      if (normalized !== entry.relativePath) {
        errors.push(`Invalid or unsafe path for manifest entry: ${entry.relativePath}`);

        continue;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);

      errors.push(`${entry.relativePath}: ${message}`);

      continue;
    }

    let actualHex: string;

    try {
      actualHex = await hashFileSha256Hex(fileAbs);
    } catch {
      errors.push(`Missing or unreadable: ${entry.relativePath}`);

      continue;
    }

    if (actualHex !== entry.sha256Hex) {
      errors.push(`Checksum mismatch: ${entry.relativePath} (expected ${entry.sha256Hex}, got ${actualHex})`);

      continue;
    }

    verifiedCount++;
  }

  return { ok: errors.length === 0, verifiedCount, errors };
}

/**
 * Loads manifests from disk (see {@link readExpectedArtifactsFromRoot}) and verifies files on disk.
 */
export async function verifyDirectoryAgainstManifest(
  rootAbs: string,
  options?: { readonly source?: IntegrityManifestSource },
): Promise<VerifyIntegrityResult & { readonly used: 'sums' | 'json' }> {
  const { artifacts, used } = await readExpectedArtifactsFromRoot(rootAbs, options?.source ?? 'auto');
  const result = await verifyArtifactsAgainstDirectory(rootAbs, artifacts);

  return { ...result, used };
}
