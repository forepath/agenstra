import { isPrivateOrLoopbackHost, isPrivateOrLoopbackIp } from './private-or-loopback';

describe('isPrivateOrLoopbackIp', () => {
  it('detects RFC1918 IPv4', () => {
    expect(isPrivateOrLoopbackIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('192.168.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('203.0.113.1')).toBe(false);
  });

  it('detects IPv4-mapped private IPv6', () => {
    expect(isPrivateOrLoopbackIp('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('::ffff:203.0.113.1')).toBe(false);
  });

  it('detects IPv6 loopback and ULA', () => {
    expect(isPrivateOrLoopbackIp('::1')).toBe(true);
    expect(isPrivateOrLoopbackIp('fd12::1')).toBe(true);
    expect(isPrivateOrLoopbackIp('fe80::1')).toBe(true);
  });
});

describe('isPrivateOrLoopbackHost', () => {
  it('detects localhost-style names', () => {
    expect(isPrivateOrLoopbackHost('localhost')).toBe(true);
    expect(isPrivateOrLoopbackHost('app.localhost')).toBe(true);
    expect(isPrivateOrLoopbackHost('machine.local')).toBe(true);
  });
});
