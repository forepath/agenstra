import { hashPushSubscriptionEndpoint } from './push-subscription-endpoint-hash';

describe('hashPushSubscriptionEndpoint', () => {
  it('returns a stable SHA-256 hex digest', () => {
    const endpoint = 'https://push.example/subscriber/abc';

    expect(hashPushSubscriptionEndpoint(endpoint)).toBe(hashPushSubscriptionEndpoint(endpoint));
    expect(hashPushSubscriptionEndpoint(endpoint)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('differs for different endpoints', () => {
    expect(hashPushSubscriptionEndpoint('https://a.example/1')).not.toBe(
      hashPushSubscriptionEndpoint('https://b.example/2'),
    );
  });
});
