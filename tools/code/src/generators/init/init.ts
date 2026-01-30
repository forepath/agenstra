import { Tree, runTasksInSerial } from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { spawnSync } from 'child_process';

export async function initGenerator(_: Tree, __: InitGeneratorSchema) {
  const runMcpProxyBuild = () => {
    const result = spawnSync('npx', ['nx', 'run', 'mcp-proxy:build', '--skip-nx-cache'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    if (result.status !== 0) {
      throw new Error('Failed to execute build for project "mcp-proxy"');
    }
  };

  return runTasksInSerial(runMcpProxyBuild);
}

export default initGenerator;
