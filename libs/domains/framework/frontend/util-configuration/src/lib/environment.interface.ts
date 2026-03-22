import type {
  ApiKeyAuthenticationConfig,
  AuthenticationConfig,
  KeycloakAuthenticationConfig,
  UsersAuthenticationConfig,
} from '@forepath/identity/frontend';

// Re-export auth config types from identity for backward compatibility
export type {
  ApiKeyAuthenticationConfig,
  AuthenticationConfig,
  KeycloakAuthenticationConfig,
  UsersAuthenticationConfig,
};

export interface Environment {
  production: boolean;
  controller: {
    restApiUrl: string;
    websocketUrl: string;
  };
  billing: {
    restApiUrl: string;
    frontendUrl: string;
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
    termsUrl: string;
  };
}
