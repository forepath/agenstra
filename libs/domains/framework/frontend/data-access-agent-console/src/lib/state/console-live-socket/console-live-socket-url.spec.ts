import type { Environment } from '@forepath/framework/frontend/util-configuration';

import { resolveConsoleWebsocketUrl } from './console-live-socket-url';

describe('resolveConsoleWebsocketUrl', () => {
  const baseEnv = (controller: Environment['controller']): Environment =>
    ({
      production: false,
      controller,
      billing: { restApiUrl: '', frontendUrl: '' },
      authentication: { type: 'api-key', apiKey: 'k' },
      chatModelOptions: {},
      editor: { openInNewWindow: false },
      deployment: { openInNewWindow: false },
      cookieConsent: { domain: '', privacyPolicyUrl: '', termsUrl: '' },
    }) as Environment;

  it('uses explicit consoleWebsocketUrl when set', () => {
    const env = baseEnv({
      restApiUrl: 'http://localhost:3100',
      websocketUrl: 'http://localhost:8081/clients',
      consoleWebsocketUrl: 'http://localhost:8081/console',
    });

    expect(resolveConsoleWebsocketUrl(env)).toBe('http://localhost:8081/console');
  });

  it('derives /console from clients websocketUrl', () => {
    const env = baseEnv({
      restApiUrl: 'http://localhost:3100',
      websocketUrl: 'http://localhost:8081/clients',
    });

    expect(resolveConsoleWebsocketUrl(env)).toBe('http://localhost:8081/console');
  });

  it('returns null when websocketUrl is missing or blank', () => {
    expect(
      resolveConsoleWebsocketUrl(
        baseEnv({
          restApiUrl: 'http://localhost:3100',
          websocketUrl: '   ',
        }),
      ),
    ).toBeNull();
  });

  it('derives /console from host when websocket path is not /clients', () => {
    const env = baseEnv({
      restApiUrl: 'http://localhost:3100',
      websocketUrl: 'http://localhost:8081/custom-ns',
    });

    expect(resolveConsoleWebsocketUrl(env)).toBe('http://localhost:8081/console');
  });

  it('appends /console to non-URL base when URL parsing fails', () => {
    const env = baseEnv({
      restApiUrl: 'http://localhost:3100',
      websocketUrl: 'not-a-valid-url',
    });

    expect(resolveConsoleWebsocketUrl(env)).toBe('not-a-valid-url/console');
  });
});
