import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  controller: {
    restApiUrl: 'http://host.docker.internal:3100/api',
    websocketUrl: 'http://host.docker.internal:8081/clients',
  },
  billing: {
    restApiUrl: 'http://host.docker.internal:3200/api',
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
    termsUrl: 'https://www.agenstra.com/legal/terms',
  },
};
