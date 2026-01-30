import { addProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as fs from 'fs';
import * as path from 'path';
import { contextGenerator } from './context';

describe('context generator', () => {
  it('should default to all targets when target is not set', async () => {
    const base = path.join(process.cwd(), 'tmp-context-gen-' + Date.now());
    const agenstraDir = path.join(base, '.agenstra');
    const rulesDir = path.join(agenstraDir, 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
      'utf-8',
    );
    fs.writeFileSync(path.join(rulesDir, 'main.mdc'), '---\n---\n\n# Main\n', 'utf-8');

    const tree = createTreeWithEmptyWorkspace();
    const relativeBase = path.relative(process.cwd(), base);
    tree.write(
      path.join(relativeBase, '.agenstra/metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
    );
    tree.write(path.join(relativeBase, '.agenstra/rules/main.mdc'), '---\n---\n\n# Main\n');

    await contextGenerator(tree, { path: relativeBase, outputDir: 'generated' });

    // All three targets should be generated when target is omitted (output directly under outputDir)
    expect(tree.exists(path.join(relativeBase, 'generated/.cursor/rules/main.mdc'))).toBe(true);
    expect(tree.exists(path.join(relativeBase, 'generated/AGENTS.md'))).toBe(true);
    expect(tree.exists(path.join(relativeBase, 'generated/.github/copilot-instructions.md'))).toBe(true);

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('should run transform and write tool output to tree when target is set', async () => {
    const base = path.join(process.cwd(), 'tmp-context-gen-' + Date.now());
    const agenstraDir = path.join(base, '.agenstra');
    const rulesDir = path.join(agenstraDir, 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
      'utf-8',
    );
    fs.writeFileSync(path.join(rulesDir, 'main.mdc'), '---\n---\n\n# Main\n', 'utf-8');

    const tree = createTreeWithEmptyWorkspace();
    const relativeBase = path.relative(process.cwd(), base);
    tree.write(
      path.join(relativeBase, '.agenstra/metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
    );
    tree.write(path.join(relativeBase, '.agenstra/rules/main.mdc'), '---\n---\n\n# Main\n');

    await contextGenerator(tree, {
      path: relativeBase,
      target: ['cursor'],
      outputDir: 'generated',
    });

    const cursorRulePath = path.join(relativeBase, 'generated/.cursor/rules/main.mdc');
    expect(tree.exists(cursorRulePath)).toBe(true);
    expect(tree.read(cursorRulePath, 'utf-8')).toContain('# Main');

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('should throw when .agenstra is missing at path', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await expect(contextGenerator(tree, { path: 'apps/my-app' })).rejects.toThrow(/No .agenstra context/);
  });

  it('should default to all targets when project is set and target omitted', async () => {
    const base = path.join(process.cwd(), 'tmp-context-gen-project-' + Date.now());
    const agenstraDir = path.join(base, '.agenstra');
    fs.mkdirSync(agenstraDir, { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'backend-api' }),
      'utf-8',
    );

    const tree = createTreeWithEmptyWorkspace();
    const relativeBase = path.relative(process.cwd(), base);
    addProjectConfiguration(tree, 'backend-api', {
      root: relativeBase,
      projectType: 'application',
      sourceRoot: path.join(relativeBase, 'src'),
    });
    tree.write(
      path.join(relativeBase, '.agenstra/metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'backend-api' }),
    );

    await contextGenerator(tree, { project: 'backend-api', outputDir: 'generated' });

    // All targets emit at least one file (output directly under outputDir)
    expect(tree.exists(path.join(relativeBase, 'generated/.cursor/mcp.json'))).toBe(true);
    expect(tree.exists(path.join(relativeBase, 'generated/AGENTS.md'))).toBe(true);
    expect(tree.exists(path.join(relativeBase, 'generated/.github/copilot-instructions.md'))).toBe(true);

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('should throw when project is set but .agenstra is missing', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'backend-api', {
      root: 'apps/backend-api',
      projectType: 'application',
      sourceRoot: 'apps/backend-api/src',
    });

    await expect(contextGenerator(tree, { project: 'backend-api' })).rejects.toThrow(/No .agenstra context/);
  });

  it('should pass with dryRun when .agenstra exists', async () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('libs/foo/.agenstra/metadata.json', JSON.stringify({ version: '1.0', appName: 'foo' }));

    await expect(contextGenerator(tree, { path: 'libs/foo', dryRun: true })).resolves.toBeUndefined();
  });
});
