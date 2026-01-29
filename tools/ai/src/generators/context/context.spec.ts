import { addProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as fs from 'fs';
import * as path from 'path';
import { contextGenerator } from './context';

describe('context generator', () => {
  it('should pass when .agenstra exists at path', async () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('apps/my-app/.agenstra/schema-version.txt', '1.0\n');
    tree.write('apps/my-app/.agenstra/metadata.json', JSON.stringify({ version: '1.0', appName: 'my-app' }));

    await expect(contextGenerator(tree, { path: 'apps/my-app' })).resolves.toBeUndefined();
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
    fs.writeFileSync(path.join(agenstraDir, 'schema-version.txt'), '1.0\n', 'utf-8');
    fs.writeFileSync(path.join(rulesDir, 'main.md'), '# Main\n', 'utf-8');

    const tree = createTreeWithEmptyWorkspace();
    const relativeBase = path.relative(process.cwd(), base);
    tree.write(path.join(relativeBase, '.agenstra/schema-version.txt'), '1.0\n');
    tree.write(
      path.join(relativeBase, '.agenstra/metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
    );

    await contextGenerator(tree, {
      path: relativeBase,
      target: ['cursor'],
      outputDir: 'generated',
    });

    const cursorRulePath = path.join(relativeBase, 'generated/cursor/.cursor/rules/main.mdc');
    expect(tree.exists(cursorRulePath)).toBe(true);
    expect(tree.read(cursorRulePath, 'utf-8')).toContain('# Main');

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('should throw when .agenstra is missing at path', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await expect(contextGenerator(tree, { path: 'apps/my-app' })).rejects.toThrow(/No .agenstra context/);
  });

  it('should pass when project is set and has .agenstra', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'backend-api', {
      root: 'apps/backend-api',
      projectType: 'application',
      sourceRoot: 'apps/backend-api/src',
    });
    tree.write('apps/backend-api/.agenstra/schema-version.txt', '1.0\n');
    tree.write('apps/backend-api/.agenstra/metadata.json', JSON.stringify({ version: '1.0' }));

    await expect(contextGenerator(tree, { project: 'backend-api' })).resolves.toBeUndefined();
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
    tree.write('libs/foo/.agenstra/schema-version.txt', '1.0\n');
    tree.write('libs/foo/.agenstra/metadata.json', JSON.stringify({ version: '1.0' }));

    await expect(contextGenerator(tree, { path: 'libs/foo', dryRun: true })).resolves.toBeUndefined();
  });
});
