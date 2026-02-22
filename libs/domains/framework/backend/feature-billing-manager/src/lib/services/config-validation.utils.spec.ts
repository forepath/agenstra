import { validateConfigSchema } from '../utils/config-validation.utils';

describe('validateConfigSchema', () => {
  it('returns errors for missing required fields', () => {
    const errors = validateConfigSchema({ required: ['region'] }, {});
    expect(errors.length).toBe(1);
  });

  it('returns errors for invalid types', () => {
    const errors = validateConfigSchema(
      { properties: { region: { type: 'string' }, count: { type: 'number' } } },
      { region: 123, count: 'test' },
    );
    expect(errors.length).toBe(2);
  });

  it('returns no errors for valid config', () => {
    const errors = validateConfigSchema(
      {
        required: ['region'],
        properties: { region: { type: 'string' }, count: { type: 'number' }, enabled: { type: 'boolean' } },
      },
      { region: 'fsn1', count: 2, enabled: false },
    );
    expect(errors.length).toBe(0);
  });
});
