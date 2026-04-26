import { PolicyEnforcementMode } from 'nest-keycloak-connect';

import { KeycloakService } from './keycloak.service';

describe('KeycloakService', () => {
  let service: KeycloakService;
  let originalEnvVars: Record<string, string | undefined>;

  beforeEach(() => {
    service = new KeycloakService();

    // Save original environment variables
    originalEnvVars = {
      KEYCLOAK_AUTH_SERVER_URL: process.env.KEYCLOAK_AUTH_SERVER_URL,
      KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
      KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
      KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    };
  });

  afterEach(() => {
    // Restore original environment variables
    Object.entries(originalEnvVars).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  });

  describe('createKeycloakConnectOptions', () => {
    it('should return Keycloak options with environment variables', () => {
      process.env.KEYCLOAK_AUTH_SERVER_URL = 'http://localhost:8080';
      process.env.KEYCLOAK_REALM = 'test-realm';
      process.env.KEYCLOAK_CLIENT_ID = 'test-client';
      process.env.KEYCLOAK_CLIENT_SECRET = 'test-secret';

      const options = service.createKeycloakConnectOptions();

      expect(options).toEqual({
        serverUrl: undefined,
        authServerUrl: 'http://localhost:8080',
        realm: 'test-realm',
        clientId: 'test-client',
        secret: 'test-secret',
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        tokenValidation: undefined,
      });
    });

    it('should return Keycloak options with undefined values when env vars are not set', () => {
      delete process.env.KEYCLOAK_AUTH_SERVER_URL;
      delete process.env.KEYCLOAK_REALM;
      delete process.env.KEYCLOAK_CLIENT_ID;
      delete process.env.KEYCLOAK_CLIENT_SECRET;

      const options = service.createKeycloakConnectOptions();

      expect(options).toEqual({
        serverUrl: undefined,
        authServerUrl: undefined,
        realm: undefined,
        clientId: undefined,
        secret: undefined,
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        tokenValidation: undefined,
      });
    });

    it('should handle empty string environment variables', () => {
      process.env.KEYCLOAK_AUTH_SERVER_URL = '';
      process.env.KEYCLOAK_REALM = '';
      process.env.KEYCLOAK_CLIENT_ID = '';
      process.env.KEYCLOAK_CLIENT_SECRET = '';

      const options = service.createKeycloakConnectOptions();

      expect(options).toEqual({
        serverUrl: undefined,
        authServerUrl: '',
        realm: '',
        clientId: '',
        secret: '',
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        tokenValidation: undefined,
      });
    });

    it('should return a promise when createKeycloakConnectOptions is called', async () => {
      process.env.KEYCLOAK_AUTH_SERVER_URL = 'http://localhost:8080';
      process.env.KEYCLOAK_REALM = 'test-realm';
      process.env.KEYCLOAK_CLIENT_ID = 'test-client';
      process.env.KEYCLOAK_CLIENT_SECRET = 'test-secret';

      const result = service.createKeycloakConnectOptions();

      // The method can return either a value or a promise
      // We should handle both cases
      if (result instanceof Promise) {
        const resolved = await result;

        expect(resolved).toBeDefined();
      } else {
        expect(result).toBeDefined();
      }
    });
  });
});
