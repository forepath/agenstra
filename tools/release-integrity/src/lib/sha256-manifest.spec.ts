import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  buildIntegrityArtifactsForDirectory,
  buildIntegrityManifestJson,
  EMPTY_SHA256_HEX,
  formatSha256SumLine,
  formatSha256SumsFile,
  hashFileSha256Hex,
  normalizeManifestRelativePath,
  parseIntegrityManifestJsonContent,
  parseSha256SumsFileContent,
  readExpectedArtifactsFromRoot,
  sha256HexOfBuffer,
  verifyArtifactsAgainstDirectory,
  verifyDirectoryAgainstManifest,
  writeIntegrityFiles,
} from './sha256-manifest';

describe('sha256-manifest', () => {
  it('sha256HexOfBuffer matches empty string vector', () => {
    expect(sha256HexOfBuffer(Buffer.alloc(0))).toBe(EMPTY_SHA256_HEX);
  });

  it('formatSha256SumLine uses two spaces', () => {
    expect(formatSha256SumLine('ab'.repeat(32), 'zip/linux/x64/app.zip')).toBe(
      `${'ab'.repeat(32)}  zip/linux/x64/app.zip`,
    );
  });

  it('formatSha256SumsFile sorts paths and ends with newline', () => {
    const a = { relativePath: 'b.bin', sha256Hex: 'b'.repeat(64) };
    const b = { relativePath: 'a.bin', sha256Hex: 'a'.repeat(64) };
    const text = formatSha256SumsFile([a, b]);

    expect(text).toBe(`${'a'.repeat(64)}  a.bin\n${'b'.repeat(64)}  b.bin\n`);
  });

  it('parseSha256SumsFileContent roundtrips', () => {
    const artifacts = [
      { relativePath: 'a.bin', sha256Hex: 'a'.repeat(64) },
      { relativePath: 'b/c.bin', sha256Hex: 'c'.repeat(64) },
    ];
    const text = formatSha256SumsFile(artifacts);

    expect(parseSha256SumsFileContent(text)).toEqual([
      { relativePath: 'a.bin', sha256Hex: 'a'.repeat(64) },
      { relativePath: 'b/c.bin', sha256Hex: 'c'.repeat(64) },
    ]);
  });

  it('parseSha256SumsFileContent accepts binary marker from GNU sha256sum', () => {
    const line = `${'d'.repeat(64)} *a.bin`;

    expect(parseSha256SumsFileContent(`${line}\n`)).toEqual([{ relativePath: 'a.bin', sha256Hex: 'd'.repeat(64) }]);
  });

  it('normalizeManifestRelativePath uses forward slashes', () => {
    const root = path.join(os.tmpdir(), 'manifest-root');
    const nested = path.join(root, 'x', 'y.zip');

    expect(normalizeManifestRelativePath(nested, root)).toBe('x/y.zip');
  });

  it('normalizeManifestRelativePath rejects escape', () => {
    const root = path.join(os.tmpdir(), 'manifest-root');

    expect(() => normalizeManifestRelativePath(path.join(os.tmpdir(), 'other', 'f'), root)).toThrow(/escapes root/);
  });

  it('buildIntegrityManifestJson sets schema fields', () => {
    const manifest = buildIntegrityManifestJson([{ relativePath: 'a', sha256Hex: 'a'.repeat(64) }]);

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.algorithm).toBe('sha256');
    expect(manifest.root).toBe('.');
    expect(manifest.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(manifest.artifacts).toHaveLength(1);
  });

  it('buildIntegrityArtifactsForDirectory hashes files and skips manifest outputs', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-'));

    await fs.promises.writeFile(path.join(dir, 'one.txt'), 'hello', 'utf-8');
    await fs.promises.mkdir(path.join(dir, 'sub'), { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'sub', 'two.txt'), 'world', 'utf-8');
    await fs.promises.writeFile(path.join(dir, 'SHA256SUMS'), 'skip-me', 'utf-8');

    const artifacts = await buildIntegrityArtifactsForDirectory(dir);

    expect(artifacts.map((x) => x.relativePath).sort()).toEqual(['one.txt', 'sub/two.txt']);
    const expectedOneHex = await hashFileSha256Hex(path.join(dir, 'one.txt'));

    expect(artifacts.filter((x) => x.relativePath === 'one.txt')).toEqual([
      { relativePath: 'one.txt', sha256Hex: expectedOneHex },
    ]);
  });

  it('writeIntegrityFiles writes SHA256SUMS and integrity-manifest.json', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-out-'));

    await fs.promises.writeFile(path.join(dir, 'f.bin'), Buffer.from([1, 2, 3]));

    const artifacts = await buildIntegrityArtifactsForDirectory(dir);

    await writeIntegrityFiles(dir, artifacts);

    const sums = await fs.promises.readFile(path.join(dir, 'SHA256SUMS'), 'utf-8');

    expect(parseSha256SumsFileContent(sums)).toEqual(artifacts);

    const jsonRaw = await fs.promises.readFile(path.join(dir, 'integrity-manifest.json'), 'utf-8');
    const json = JSON.parse(jsonRaw) as { artifacts: typeof artifacts };

    expect(json.artifacts).toEqual(buildIntegrityManifestJson(artifacts).artifacts);
  });

  it('parseIntegrityManifestJsonContent accepts a valid manifest', () => {
    const hex = 'a'.repeat(64);
    const raw = JSON.stringify({
      schemaVersion: 1,
      algorithm: 'sha256',
      root: '.',
      generatedAt: '2020-01-01T00:00:00.000Z',
      artifacts: [{ relativePath: 'x.bin', sha256Hex: hex }],
    });
    const parsed = parseIntegrityManifestJsonContent(raw);

    expect(parsed.artifacts).toEqual([{ relativePath: 'x.bin', sha256Hex: hex }]);
  });

  it('parseIntegrityManifestJsonContent rejects invalid digest length', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      algorithm: 'sha256',
      artifacts: [{ relativePath: 'x.bin', sha256Hex: 'deadbeef' }],
    });

    expect(() => parseIntegrityManifestJsonContent(raw)).toThrow(/invalid sha256Hex/);
  });

  it('readExpectedArtifactsFromRoot prefers SHA256SUMS when both exist', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-read-'));

    await fs.promises.writeFile(path.join(dir, 'a.txt'), 'a', 'utf-8');
    const sumsOnly = [{ relativePath: 'a.txt', sha256Hex: await hashFileSha256Hex(path.join(dir, 'a.txt')) }];

    await fs.promises.writeFile(path.join(dir, 'SHA256SUMS'), formatSha256SumsFile(sumsOnly), 'utf-8');
    await fs.promises.writeFile(
      path.join(dir, 'integrity-manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        algorithm: 'sha256',
        root: '.',
        generatedAt: 'x',
        artifacts: [{ relativePath: 'a.txt', sha256Hex: 'b'.repeat(64) }],
      }),
      'utf-8',
    );

    const { artifacts, used } = await readExpectedArtifactsFromRoot(dir, 'auto');

    expect(used).toBe('sums');
    expect(artifacts).toEqual(sumsOnly);
  });

  it('verifyArtifactsAgainstDirectory succeeds when files match', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-verify-ok-'));

    await fs.promises.writeFile(path.join(dir, 'k.txt'), 'content', 'utf-8');
    const hex = await hashFileSha256Hex(path.join(dir, 'k.txt'));
    const result = await verifyArtifactsAgainstDirectory(dir, [{ relativePath: 'k.txt', sha256Hex: hex }]);

    expect(result).toEqual({ ok: true, verifiedCount: 1, errors: [] });
  });

  it('verifyArtifactsAgainstDirectory reports checksum mismatch', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-verify-bad-'));

    await fs.promises.writeFile(path.join(dir, 'k.txt'), 'content', 'utf-8');
    const wrong = '0'.repeat(64);
    const result = await verifyArtifactsAgainstDirectory(dir, [{ relativePath: 'k.txt', sha256Hex: wrong }]);

    expect(result.ok).toBe(false);
    expect(result.verifiedCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Checksum mismatch/);
  });

  it('verifyArtifactsAgainstDirectory reports missing file', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-verify-miss-'));
    const result = await verifyArtifactsAgainstDirectory(dir, [
      { relativePath: 'nope.bin', sha256Hex: 'f'.repeat(64) },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Missing or unreadable/);
  });

  it('verifyDirectoryAgainstManifest end-to-end', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'integrity-e2e-'));

    await fs.promises.writeFile(path.join(dir, 'f.bin'), Buffer.from([9]), 'utf-8');
    const artifacts = await buildIntegrityArtifactsForDirectory(dir);

    await writeIntegrityFiles(dir, artifacts);

    const ok = await verifyDirectoryAgainstManifest(dir);

    expect(ok.ok).toBe(true);
    expect(ok.verifiedCount).toBe(1);
    expect(ok.used).toBe('sums');

    await fs.promises.writeFile(path.join(dir, 'f.bin'), Buffer.from([8]), 'utf-8');
    const bad = await verifyDirectoryAgainstManifest(dir);

    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});
