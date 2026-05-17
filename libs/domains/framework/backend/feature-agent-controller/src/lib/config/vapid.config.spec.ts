import { isVapidConfigured, readVapidConfigFromEnv } from './vapid.config';

describe('vapid.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('readVapidConfigFromEnv returns null when keys are missing', () => {
    expect(readVapidConfigFromEnv()).toBeNull();
    expect(isVapidConfigured()).toBe(false);
  });

  it('readVapidConfigFromEnv returns config when keys are set', () => {
    process.env.VAPID_PUBLIC_KEY = ' public-key ';
    process.env.VAPID_PRIVATE_KEY = ' private-key ';
    process.env.VAPID_SUBJECT = 'mailto:dev@example.com';

    expect(readVapidConfigFromEnv()).toEqual({
      publicKey: 'public-key',
      privateKey: 'private-key',
      subject: 'mailto:dev@example.com',
    });
    expect(isVapidConfigured()).toBe(true);
  });

  it('readVapidConfigFromEnv uses default subject when unset', () => {
    process.env.VAPID_PUBLIC_KEY = 'public-key';
    process.env.VAPID_PRIVATE_KEY = 'private-key';

    expect(readVapidConfigFromEnv()?.subject).toBe('mailto:admin@localhost');
  });
});
