import { detectPackageManager, ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { createLockFile, createPackageJson, getLockFileName } from '@nx/js';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SbomExecutorOptions {
  outputPath?: string;
  specVersion?: string | number;
  omit?: string[];
  validate?: boolean;
  skip?: boolean;
  packageLockOnly?: boolean;
  /** When set, overrides root `version` in package.json and package-lock.json before SBOM generation. */
  appVersion?: string;
}

function applyAppVersionToNpmManifests(workDir: string, appVersion: string): void {
  const packageJsonPath = path.join(workDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}; cannot apply appVersion.`);
  }
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version?: string };
  pkg.version = appVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf-8');

  const packageLockPath = path.join(workDir, 'package-lock.json');
  if (!fs.existsSync(packageLockPath)) {
    return;
  }
  const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8')) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };
  lock.version = appVersion;
  const rootPackage = lock.packages?.[''];
  if (rootPackage) {
    rootPackage.version = appVersion;
  }
  fs.writeFileSync(packageLockPath, JSON.stringify(lock, null, 2), 'utf-8');
}

function resolveCyclonedxNpmCliPath(root: string): string {
  const cliPath = path.join(root, 'node_modules', '@cyclonedx', 'cyclonedx-npm', 'bin', 'cyclonedx-npm-cli.js');
  if (!fs.existsSync(cliPath)) {
    throw new Error(
      `cyclonedx-npm CLI not found at ${cliPath}. Run install at the workspace root so @cyclonedx/cyclonedx-npm is present.`,
    );
  }
  return cliPath;
}

export default async function sbomExecutor(
  options: SbomExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const {
    outputPath = 'dist/sboms',
    specVersion = '1.6',
    omit = [],
    validate = false,
    skip = false,
    packageLockOnly = true,
    appVersion = process.env.VERSION,
  } = options;

  const specVersionStr = String(specVersion);

  if (skip) {
    logger.log('SBOM generation skipped for this project.');
    return { success: true };
  }

  const projectName = context.projectName ?? '';
  const projectNode = context.projectGraph?.nodes?.[projectName];
  if (!projectNode) {
    throw new Error(`Project "${projectName}" not found in project graph.`);
  }

  const projectRoot = (projectNode.data?.root as string) ?? '';
  const absoluteProjectRoot = path.join(workspaceRoot, 'dist', projectRoot);
  const projectPackageJsonPath = path.join(absoluteProjectRoot, 'package.json');
  const hasProjectPackageJson = fs.existsSync(projectPackageJsonPath);

  const absoluteOutputPath = path.isAbsolute(outputPath) ? outputPath : path.join(workspaceRoot, outputPath);
  const sbomOutputFile = path.join(absoluteOutputPath, `${projectName}.cdx.json`);

  let workDir: string;
  if (hasProjectPackageJson) {
    workDir = absoluteProjectRoot;
    logger.log(`Using project package.json at ${projectRoot} for SBOM generation.`);
  } else {
    workDir = path.join(workspaceRoot, 'dist', 'sbom-work', projectName);
    fs.mkdirSync(workDir, { recursive: true });

    const packageJson = createPackageJson(projectName, context.projectGraph!, {
      root: workspaceRoot,
      isProduction: true,
    });
    const packageManager = detectPackageManager(workspaceRoot);
    const lockFileName = getLockFileName(packageManager);
    const lockFileContent = createLockFile(packageJson, context.projectGraph!, packageManager);

    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');
    fs.writeFileSync(path.join(workDir, lockFileName), lockFileContent, 'utf-8');
    logger.log(`Generated app-specific manifest and lockfile at dist/sbom-work/${projectName}`);
  }

  const resolvedAppVersion = appVersion?.trim();
  if (resolvedAppVersion) {
    applyAppVersionToNpmManifests(workDir, resolvedAppVersion);
  }

  fs.mkdirSync(path.dirname(sbomOutputFile), { recursive: true });

  const cyclonedxNpmArgs = [
    'package.json',
    '--output-file',
    sbomOutputFile,
    '--output-format',
    'JSON',
    '--output-reproducible',
    '--ignore-npm-errors',
    '--spec-version',
    specVersionStr,
  ];
  if (packageLockOnly) {
    cyclonedxNpmArgs.push('--package-lock-only');
  }
  for (const o of omit) {
    cyclonedxNpmArgs.push('--omit', o);
  }

  const cyclonedxCli = resolveCyclonedxNpmCliPath(workspaceRoot);
  const npmResult = spawnSync(process.execPath, [cyclonedxCli, ...cyclonedxNpmArgs], {
    cwd: workDir,
    stdio: 'inherit',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (npmResult.status !== 0) {
    logger.error('cyclonedx-npm failed.');
    return { success: false };
  }

  if (validate) {
    const validateResult = spawnSync('cyclonedx-cli', ['validate', '--input-file', sbomOutputFile], {
      cwd: workspaceRoot,
      stdio: 'inherit',
      maxBuffer: 5 * 1024 * 1024,
      shell: true,
    });
    if (validateResult.error && (validateResult.error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.warn(
        'cyclonedx-cli not found in PATH. Install from https://github.com/CycloneDX/cyclonedx-cli/releases or set validate: false.',
      );
    } else if (validateResult.status !== 0) {
      logger.error('cyclonedx-cli validate failed.');
      return { success: false };
    }
  }

  logger.log(`SBOM written to ${sbomOutputFile}`);
  return { success: true };
}
