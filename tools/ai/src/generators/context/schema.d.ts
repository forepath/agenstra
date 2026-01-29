export enum AiTool {
  ALL = 'all',
  GENERIC = 'generic',
  CLAUDE = 'claude',
  GITHUB_COPILOT = 'github-copilot',
  CURSOR = 'cursor',
}

export interface ContextGeneratorSchema {
  path: string;
  tool: AiTool;
}
