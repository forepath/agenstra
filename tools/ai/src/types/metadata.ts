export interface AgenstraMetadata {
  version: string;
  appName: string;
  description?: string;
  team?: string;
  defaultModel?: string;
  contextWindow?: number;
  tags?: string[];
  tools?: string[];
  agents?: string[];
  subagents?: string[];
}
