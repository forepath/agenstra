import * as fs from 'fs';
import * as path from 'path';
import { readContext } from './context-reader';

describe('readContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(process.cwd(), 'tmp-reader-test-' + Date.now());
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should throw when directory does not exist', () => {
    expect(() => readContext(path.join(tmpDir, '.agenstra'))).toThrow(/Not a directory/);
  });

  it('should throw when metadata.json is missing or invalid', () => {
    fs.mkdirSync(path.join(tmpDir, '.agenstra'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agenstra', 'metadata.json'), '{}', 'utf-8');
    expect(() => readContext(path.join(tmpDir, '.agenstra'))).toThrow(/version and appName/);
  });

  it('should read valid .agenstra and return context', () => {
    const agenstraDir = path.join(tmpDir, '.agenstra');
    fs.mkdirSync(agenstraDir, { recursive: true });
    fs.mkdirSync(path.join(agenstraDir, 'rules'), { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
      'utf-8',
    );
    fs.writeFileSync(path.join(agenstraDir, 'rules', 'coding.md'), '# Coding\n', 'utf-8');

    const context = readContext(agenstraDir);
    expect(context.metadata.version).toBe('1.0');
    expect(context.metadata.appName).toBe('test-app');
    expect(context.rules['coding']).toContain('# Coding');
    expect(Object.keys(context.commands)).toEqual([]);
    expect(Object.keys(context.skills)).toEqual([]);
    expect(Object.keys(context.agents)).toEqual([]);
    expect(Object.keys(context.subagents)).toEqual([]);
  });
});
