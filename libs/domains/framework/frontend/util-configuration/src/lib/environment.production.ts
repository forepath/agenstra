import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  controller: {
    restApiUrl: 'http://host.docker.internal:3100/api',
    websocketUrl: 'http://host.docker.internal:8081/clients',
  },
  authentication: {
    type: 'api-key',
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
