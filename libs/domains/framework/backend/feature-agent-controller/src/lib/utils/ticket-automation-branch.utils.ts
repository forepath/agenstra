import type { GitBranchDto } from '@forepath/framework/backend/feature-agent-manager';

export function listContainsBranchName(branches: readonly GitBranchDto[], name: string): boolean {
  return branches.some((b) => b.name === name);
}
