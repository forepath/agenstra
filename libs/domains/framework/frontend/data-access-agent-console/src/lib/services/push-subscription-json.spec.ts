import { parsePushSubscriptionPayload } from './push-subscription-json';

describe('parsePushSubscriptionPayload', () => {
  it('returns null when json is missing', () => {
    expect(parsePushSubscriptionPayload(null)).toBeNull();
    expect(parsePushSubscriptionPayload(undefined)).toBeNull();
  });

  it('returns null when endpoint is missing', () => {
    expect(parsePushSubscriptionPayload({ keys: { p256dh: 'p', auth: 'a' } })).toBeNull();
  });

  it('returns null when keys are incomplete', () => {
    expect(
      parsePushSubscriptionPayload({
        endpoint: 'https://push.example/sub/1',
        keys: { p256dh: 'p' },
      }),
    ).toBeNull();
    expect(
      parsePushSubscriptionPayload({
        endpoint: 'https://push.example/sub/1',
        keys: { auth: 'a' },
      }),
    ).toBeNull();
  });

  it('returns normalized payload when valid', () => {
    expect(
      parsePushSubscriptionPayload({
        endpoint: 'https://push.example/sub/1',
        keys: { p256dh: 'key-p256dh', auth: 'key-auth' },
      }),
    ).toEqual({
      endpoint: 'https://push.example/sub/1',
      p256dh: 'key-p256dh',
      auth: 'key-auth',
    });
  });
});
