export interface AgenstraAgent {
  id?: string;
  name: string;
  description?: string;
  mode: 'primary';
  /** Body/prompt content from MDC (when source is .agent.mdc). */
  body?: string;
  temperature?: number;
  model?: string;
  tools?: Record<string, unknown>;
}
