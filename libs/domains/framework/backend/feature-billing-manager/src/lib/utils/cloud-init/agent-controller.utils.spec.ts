import {
  buildAgentControllerUpdateCommand,
  buildBillingCloudInitUserData,
  buildCloudInitConfigFromRequest,
  CloudInitConfig,
} from './agent-controller.utils';

describe('cloud-init.utils', () => {
  describe('buildCloudInitConfigFromRequest', () => {
    it('sets host.fqdn and cors.origin from hostname and baseDomain', () => {
      const config = buildCloudInitConfigFromRequest(
        { authenticationMethod: 'users' },
        'awesome-armadillo-abc12',
        'spirde.com',
      );

      expect(config.host.hostname).toBe('awesome-armadillo-abc12');
      expect(config.host.fqdn).toBe('awesome-armadillo-abc12.spirde.com');
      expect(config.backend.cors.origin).toBe('https://awesome-armadillo-abc12.spirde.com');
    });

    it('defaults baseDomain to spirde.com when not provided', () => {
      const config = buildCloudInitConfigFromRequest({}, 'foo');

      expect(config.host.fqdn).toBe('foo.spirde.com');
    });

    it('generates random encryptionKey and jwtSecret', () => {
      const config1 = buildCloudInitConfigFromRequest({}, 'host1');
      const config2 = buildCloudInitConfigFromRequest({}, 'host2');

      expect(config1.backend.encryption.encryptionKey).toBeTruthy();
      expect(config1.backend.encryption.jwtSecret).toBeTruthy();
      expect(config1.backend.encryption.encryptionKey).not.toBe(config2.backend.encryption.encryptionKey);
      expect(config1.backend.encryption.jwtSecret).not.toBe(config2.backend.encryption.jwtSecret);
    });

    it('sets provisioning tokens from effectiveConfig when provided', () => {
      const config = buildCloudInitConfigFromRequest(
        {
          hetznerApiToken: 'secret-hetzner',
          digitaloceanApiToken: 'secret-do',
        },
        'host1',
      );

      expect(config.backend.provisioning?.hetznerApiToken).toBe('secret-hetzner');
      expect(config.backend.provisioning?.digitaloceanApiToken).toBe('secret-do');
    });

    it('defaults provisioning tokens to empty string when not provided', () => {
      const config = buildCloudInitConfigFromRequest({}, 'host1');

      expect(config.backend.provisioning?.hetznerApiToken).toBe('');
      expect(config.backend.provisioning?.digitaloceanApiToken).toBe('');
    });

    it('sets ssh.publicKey from effectiveConfig.sshPublicKey when provided', () => {
      const config = buildCloudInitConfigFromRequest(
        { sshPublicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIexample user@host' },
        'host1',
      );

      expect(config.ssh.publicKey).toBe('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIexample user@host');
    });

    it('defaults ssh.publicKey to empty string when not provided', () => {
      const config = buildCloudInitConfigFromRequest({}, 'host1');

      expect(config.ssh.publicKey).toBe('');
    });
  });

  describe('buildBillingCloudInitUserData', () => {
    it('produces nginx config with api location and agent-controller', () => {
      const config: CloudInitConfig = {
        ssh: { publicKey: '' },
        host: { hostname: 'test', fqdn: 'test.spirde.com' },
        proxy: { httpPort: 80, httpsPort: 443, websocketPort: 8443 },
        frontend: { host: '0.0.0.0', port: 4200, nodeEnv: 'production', defaultLocale: 'en' },
        backend: {
          host: '0.0.0.0',
          port: 3100,
          websocketPort: 8081,
          websocketNamespace: 'websocket',
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
          cors: { origin: 'https://test.spirde.com' },
          rateLimit: { enabled: false, ttl: 60, limit: 100 },
        },
      };
      const b64 = buildBillingCloudInitUserData(config);
      const script = Buffer.from(b64, 'base64').toString('utf-8');

      expect(script).toContain('location /api/');
      expect(script).toContain('agent-controller-api');
    });

    it('configures certbot webroot, letsencrypt paths and renewal for fqdn', () => {
      const config: CloudInitConfig = {
        ssh: { publicKey: '' },
        host: { hostname: 'my-instance', fqdn: 'my-instance.example.com' },
        proxy: { httpPort: 80, httpsPort: 443, websocketPort: 8443 },
        frontend: { host: '0.0.0.0', port: 4200, nodeEnv: 'production', defaultLocale: 'en' },
        backend: {
          host: '0.0.0.0',
          port: 3100,
          websocketPort: 8081,
          websocketNamespace: 'websocket',
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

      expect(script).toContain('certbot certonly --webroot');
      expect(script).toContain('/opt/certbot');
      expect(script).toContain('/.well-known/acme-challenge/');
      expect(script).toContain('/etc/letsencrypt/live/my-instance.example.com/fullchain.pem');
      expect(script).toContain('/etc/letsencrypt/live/my-instance.example.com/privkey.pem');
      expect(script).toContain("certbot renew -q --deploy-hook 'docker exec agent-controller-nginx nginx -s reload'");
      expect(script).toContain('subjectAltName=DNS:my-instance.example.com');
      expect(script).toContain('CN=my-instance.example.com');
    });

    it('includes ssh.publicKey in authorized_keys in the script when set', () => {
      const key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIexample user@host';
      const config: CloudInitConfig = {
        ssh: { publicKey: key },
        host: { hostname: 'test', fqdn: 'test.spirde.com' },
        proxy: { httpPort: 80, httpsPort: 443, websocketPort: 8443 },
        frontend: { host: '0.0.0.0', port: 4200, nodeEnv: 'production', defaultLocale: 'en' },
        backend: {
          host: '0.0.0.0',
          port: 3100,
          websocketPort: 8081,
          websocketNamespace: 'websocket',
          nodeEnv: 'production',
          defaultLocale: 'en',
          database: {
            host: 'postgres',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
          },
          authentication: { authenticationMethod: 'users', disableSignup: false },
          encryption: { encryptionKey: 'k', jwtSecret: 's' },
          smtp: { host: 'm', port: 1025, user: '', password: '', from: 'n@l' },
          cors: { origin: '' },
          rateLimit: { enabled: false, ttl: 60, limit: 100 },
        },
      };
      const b64 = buildBillingCloudInitUserData(config);
      const script = Buffer.from(b64, 'base64').toString('utf-8');

      expect(script).toContain('/root/.ssh/authorized_keys');
      expect(script).toContain(key);
    });

    it('configures OpenSSH server with sshd_config and restarts service', () => {
      const config: CloudInitConfig = {
        ssh: { publicKey: '' },
        host: { hostname: 'test', fqdn: 'test.spirde.com' },
        proxy: { httpPort: 80, httpsPort: 443, websocketPort: 8443 },
        frontend: { host: '0.0.0.0', port: 4200, nodeEnv: 'production', defaultLocale: 'en' },
        backend: {
          host: '0.0.0.0',
          port: 3100,
          websocketPort: 8081,
          websocketNamespace: 'websocket',
          nodeEnv: 'production',
          defaultLocale: 'en',
          database: {
            host: 'postgres',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
          },
          authentication: { authenticationMethod: 'users', disableSignup: false },
          encryption: { encryptionKey: 'k', jwtSecret: 's' },
          smtp: { host: 'm', port: 1025, user: '', password: '', from: 'n@l' },
          cors: { origin: '' },
          rateLimit: { enabled: false, ttl: 60, limit: 100 },
        },
      };
      const b64 = buildBillingCloudInitUserData(config);
      const script = Buffer.from(b64, 'base64').toString('utf-8');

      expect(script).toContain('/etc/ssh/sshd_config');
      expect(script).toContain('PermitRootLogin yes');
      expect(script).toContain('PasswordAuthentication no');
      expect(script).toContain('Configuring SSH server');
      expect(script).toContain('service ssh restart');
    });
  });

  describe('buildAgentControllerUpdateCommand', () => {
    it('returns a command that logs to agent-controller-update.log and runs docker compose up -d --pull=always', () => {
      const cmd = buildAgentControllerUpdateCommand();

      expect(cmd).toContain('/var/log/agent-controller-update.log');
      expect(cmd).toContain('cd /opt/agent-controller');
      expect(cmd).toContain('docker compose up -d --pull=always');
      expect(cmd).toContain('ERROR: Update failed');
    });
  });
});
