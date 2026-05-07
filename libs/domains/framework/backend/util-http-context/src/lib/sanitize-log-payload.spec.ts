import { sanitizeLogPayload } from './sanitize-log-payload';

describe('sanitizeLogPayload', () => {
  it('redacts sensitive keys deeply', () => {
    expect(sanitizeLogPayload({ password: 'x', nested: { access_token: 't' }, ok: 1 })).toEqual({
      password: '[REDACTED]',
      nested: { access_token: '[REDACTED]' },
      ok: 1,
    });
  });

  it('redacts JWT-shaped strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XwpL5Qu9lrVzpRw9qTXY';

    expect(sanitizeLogPayload({ detail: jwt })).toEqual({ detail: '[REDACTED]' });
  });

  it('sanitizes bearer/basic/apikey strings', () => {
    expect(sanitizeLogPayload('Authorization: Bearer abc.def.ghi')).toContain('Bearer [REDACTED]');
    expect(sanitizeLogPayload('Basic dXNlcjpwYXNz')).toBe('Basic [REDACTED]');
    expect(sanitizeLogPayload('ApiKey sk_live_abc')).toBe('ApiKey [REDACTED]');
  });
});
