import { redactSensitive } from './redact-sensitive';

describe('redactSensitive', () => {
  it('redacts values for sensitive key names', () => {
    const out = redactSensitive({ password: 'x', safe: 'y' }) as Record<string, unknown>;

    expect(out.password).toBe('[REDACTED]');
    expect(out.safe).toBe('y');
  });

  it('redacts OAuth-style keys', () => {
    const out = redactSensitive({
      access_token: 'at',
      refresh_token: 'rt',
      client_secret: 'cs',
    }) as Record<string, unknown>;

    expect(out.access_token).toBe('[REDACTED]');
    expect(out.refresh_token).toBe('[REDACTED]');
    expect(out.client_secret).toBe('[REDACTED]');
  });

  it('redacts JWT-shaped strings under benign keys', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XwpL5Qu9lrVzpRw9qTXY';
    const out = redactSensitive({ message: 'failed', detail: jwt }) as Record<string, unknown>;

    expect(out.message).toBe('failed');
    expect(out.detail).toBe('[REDACTED]');
  });

  it('redacts Bearer and Basic prefixes in string values', () => {
    expect(redactSensitive({ msg: 'Bearer abc.def.ghi' })).toEqual({ msg: '[REDACTED]' });
    expect(redactSensitive({ msg: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l' })).toEqual({ msg: '[REDACTED]' });
  });

  it('redacts top-level JWT string', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XwpL5Qu9lrVzpRw9qTXY';

    expect(redactSensitive(jwt)).toBe('[REDACTED]');
  });

  it('leaves short non-secret strings unchanged', () => {
    expect(redactSensitive('ok')).toBe('ok');
    expect(redactSensitive({ code: 'ENOENT' })).toEqual({ code: 'ENOENT' });
  });
});
