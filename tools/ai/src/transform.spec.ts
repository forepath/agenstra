import * as fs from 'fs';
import * as path from 'path';
import { transform } from './transform';

describe('transform', () => {
  let tmpDir: string;
  let agenstraDir: string;
  let outputDir: string;

  beforeEach(() => {
    const base = path.join(process.cwd(), 'tmp-transform-test-' + Date.now());
    tmpDir = base;
    agenstraDir = path.join(base, '.agenstra');
    outputDir = path.join(base, 'out');
    fs.mkdirSync(agenstraDir, { recursive: true });
    fs.mkdirSync(path.join(agenstraDir, 'rules'), { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
      'utf-8',
    );
    fs.writeFileSync(path.join(agenstraDir, 'rules', 'main.md'), '# Main\n', 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should transform to cursor and write files when not dryRun', () => {
    const result = transform({
      source: agenstraDir,
      target: 'cursor',
      outputDir,
      dryRun: false,
    });
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].tool).toBe('cursor');
    expect(result.results[0].fileCount).toBeGreaterThan(0);
    const cursorRules = path.join(outputDir, 'cursor', '.cursor', 'rules', 'main.mdc');
    expect(fs.existsSync(cursorRules)).toBe(true);
    expect(fs.readFileSync(cursorRules, 'utf-8')).toContain('# Main');
  });

  it('should not write files when dryRun', () => {
    const result = transform({
      source: agenstraDir,
      target: 'cursor',
      outputDir,
      dryRun: true,
    });
    expect(result.success).toBe(true);
    expect(result.results[0].fileCount).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(outputDir, 'cursor'))).toBe(false);
  });

  it('should return errors when source is invalid', () => {
    const result = transform({
      source: path.join(tmpDir, 'nonexistent'),
      target: 'cursor',
      outputDir,
    });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
