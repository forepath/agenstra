import { buildBillingCloudInitUserData, buildCloudInitConfigFromRequest, CloudInitConfig } from './cloud-init.utils';

describe('cloud-init.utils', () => {
  describe('buildCloudInitConfigFromRequest', () => {
    it('sets host.fqdn and cors.origin from hostname and baseDomain', () => {
      const config = buildCloudInitConfigFromRequest(
        { authenticationMethod: 'users' },
        'awesome-armadillo-abc12',
        'cloud-agent.net',
      );
      expect(config.host.hostname).toBe('awesome-armadillo-abc12');
      expect(config.host.fqdn).toBe('awesome-armadillo-abc12.cloud-agent.net');
      expect(config.backend.cors.origin).toBe('https://awesome-armadillo-abc12.cloud-agent.net');
    });

    it('defaults baseDomain to cloud-agent.net when not provided', () => {
      const config = buildCloudInitConfigFromRequest({}, 'foo');
      expect(config.host.fqdn).toBe('foo.cloud-agent.net');
    });

    it('generates random encryptionKey and jwtSecret', () => {
      const config1 = buildCloudInitConfigFromRequest({}, 'host1');
      const config2 = buildCloudInitConfigFromRequest({}, 'host2');
      expect(config1.backend.encryption.encryptionKey).toBeTruthy();
      expect(config1.backend.encryption.jwtSecret).toBeTruthy();
      expect(config1.backend.encryption.encryptionKey).not.toBe(config2.backend.encryption.encryptionKey);
      expect(config1.backend.encryption.jwtSecret).not.toBe(config2.backend.encryption.jwtSecret);
    });
  });

  describe('buildBillingCloudInitUserData', () => {
    it('produces nginx proxy_pass with trailing slash to strip /backend prefix', () => {
      const config: CloudInitConfig = {
        host: { hostname: 'test', fqdn: 'test.cloud-agent.net' },
        proxy: { httpPort: 80, httpsPort: 443, websocketPort: 8443 },
        frontend: { host: '0.0.0.0', port: 4200, nodeEnv: 'production', defaultLocale: 'en' },
        backend: {
          host: '0.0.0.0',
          port: 3100,
          websocketPort: 8081,
          nodeEnv: 'production',
          defaultLocale: 'en',
          database: {
            host: 'postgres',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
          },
          authentication: {
            authenticationMethod: 'users',
            disableSignup: false,
          },
          encryption: { encryptionKey: 'key', jwtSecret: 'secret' },
          smtp: {
            host: 'mailhog',
            port: 1025,
            user: '',
            password: '',
            from: 'noreply@localhost',
          },
          cors: { origin: 'https://test.cloud-agent.net' },
          rateLimit: { enabled: false, ttl: 60, limit: 100 },
        },
      };
      const b64 = buildBillingCloudInitUserData(config);
      const script = Buffer.from(b64, 'base64').toString('utf-8');
      expect(script).toContain('proxy_pass http://127.0.0.1:3100/;');
    });

    it('uses fqdn in SSL certificate subjectAltName', () => {
      const config: CloudInitConfig = {
        host: { hostname: 'my-instance', fqdn: 'my-instance.example.com' },
        proxy: { httpPort: 80, httpsPort: 443, websocketPort: 8443 },
        frontend: { host: '0.0.0.0', port: 4200, nodeEnv: 'production', defaultLocale: 'en' },
        backend: {
          host: '0.0.0.0',
          port: 3100,
          websocketPort: 8081,
          nodeEnv: 'production',
          defaultLocale: 'en',
          database: {
            host: 'postgres',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
          },
          authentication: {
            authenticationMethod: 'users',
            disableSignup: false,
          },
          encryption: { encryptionKey: 'k', jwtSecret: 's' },
          smtp: { host: 'm', port: 1025, user: '', password: '', from: 'n@l' },
          cors: { origin: '' },
          rateLimit: { enabled: false, ttl: 60, limit: 100 },
        },
      };
      const b64 = buildBillingCloudInitUserData(config);
      const script = Buffer.from(b64, 'base64').toString('utf-8');
      expect(script).toContain('subjectAltName=DNS:my-instance.example.com');
      expect(script).toContain('CN=my-instance.example.com');
    });
  });
});
