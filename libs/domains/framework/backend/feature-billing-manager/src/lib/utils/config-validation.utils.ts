export interface ConfigSchema {
  required?: string[];
  properties?: Record<string, { type?: 'string' | 'number' | 'boolean' | 'object' }>;
}

export function validateConfigSchema(schema: ConfigSchema | undefined, config: Record<string, unknown>): string[] {
  if (!schema) {
    return [];
  }

  const errors: string[] = [];
  const required = schema.required ?? [];
  const properties = schema.properties ?? {};

  for (const key of required) {
    if (config[key] === undefined || config[key] === null) {
      errors.push(`Missing required config field: ${key}`);
    }
  }

  for (const [key, property] of Object.entries(properties)) {
    if (config[key] === undefined || config[key] === null || !property.type) {
      continue;
    }

    const type = typeof config[key];
    if (property.type === 'object') {
      if (type !== 'object' || Array.isArray(config[key])) {
        errors.push(`Invalid type for config field ${key}: expected object`);
      }
      continue;
    }

    if (type !== property.type) {
      errors.push(`Invalid type for config field ${key}: expected ${property.type}`);
    }
  }

  return errors;
}
