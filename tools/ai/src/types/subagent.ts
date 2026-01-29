export interface AgenstraSubagent {
  id: string;
  name: string;
  description?: string;
  mode: 'subagent';
  version?: string;
  capabilities?: string[];
  rules?: string[];
  skills?: string[];
  tools?: string | string[];
  maxSteps?: number | null;
  model?: string | null;
  [key: string]: unknown;
}
