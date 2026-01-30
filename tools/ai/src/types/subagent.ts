export interface AgenstraSubagent {
  id?: string;
  name: string;
  description?: string;
  mode: 'subagent';
  /** Body/prompt content from MDC (when source is .subagent.mdc). */
  body?: string;
  temperature?: number;
  model?: string;
  tools?: Record<string, unknown>;
}
