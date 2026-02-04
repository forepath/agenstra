export interface Environment {
  production: boolean;
  controller: {
    restApiUrl: string;
    websocketUrl: string;
  };
  authentication: AuthenticationConfig;
  chatModelOptions: { [provider: string]: Record<string, string> };
  editor: {
    openInNewWindow: boolean;
  };
  deployment: {
    openInNewWindow: boolean;
  };
  cookieConsent: {
    domain: string;
    privacyPolicyUrl: string;
  };
}

export type AuthenticationConfig =
  | KeycloakAuthenticationConfig
  | ApiKeyAuthenticationConfig
  | UsersAuthenticationConfig;

export interface KeycloakAuthenticationConfig {
  type: 'keycloak';
  authServerUrl: string;
  realm: string;
  clientId: string;
}

export interface ApiKeyAuthenticationConfig {
  type: 'api-key';
  apiKey?: string;
}

export interface UsersAuthenticationConfig {
  type: 'users';
  disableSignup?: boolean;
}
