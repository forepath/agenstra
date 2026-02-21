import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  controller: {
    restApiUrl: 'http://localhost:3100/api',
    websocketUrl: 'http://localhost:8081/clients',
  },
  billing: {
    restApiUrl: 'http://localhost:3200/api',
  },
  authentication: {
    /*
    type: 'api-key',
    */
    type: 'users',
    disableSignup: false,
    /*
    type: 'keycloak',
    authServerUrl: 'http://host.docker.internal:8380',
    realm: 'agenstra',
    clientId: 'agent-frontend',
    */
  },
  chatModelOptions: {
    cursor: {},
    opencode: {},
  },
  editor: {
    openInNewWindow: true,
  },
  deployment: {
    openInNewWindow: true,
  },
  cookieConsent: {
    domain: '.agenstra.com',
    privacyPolicyUrl: 'https://www.agenstra.com/legal/privacy',
  },
};
