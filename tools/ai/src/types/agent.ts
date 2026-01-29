export interface AgenstraAgent {
  id: string;
  name: string;
  description?: string;
  mode: 'primary';
  version?: string;
  capabilities?: string[];
  rules?: string[];
  skills?: string[];
  tools?: string[];
  mcp?: string[];
  tokens?: { contextWindow?: number; outputLimit?: number };
  temperature?: number;
  handoffAgents?: string[];
  constraints?: string[];
  [key: string]: unknown;
}
