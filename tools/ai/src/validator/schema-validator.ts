import type { AgenstraContext } from '../types';

export interface ValidationResult {
  level: 'error' | 'warning';
  message: string;
  path?: string;
}

/**
 * Basic schema validation: required metadata and structure.
 */
export function validateContext(context: AgenstraContext): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { metadata, rules, commands, skills, agents, subagents } = context;

  if (!metadata.appName) {
    results.push({ level: 'error', message: 'metadata must have appName', path: 'metadata.json' });
  }

  if (Object.keys(rules).length === 0) {
    results.push({ level: 'warning', message: 'No rules found in rules/', path: 'rules/' });
  }

  return results;
}
