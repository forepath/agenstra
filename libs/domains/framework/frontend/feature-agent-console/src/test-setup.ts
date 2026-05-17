import '@angular/localize/init';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Avoid NgRx createEffect(inject()) running outside an injection context when specs import the data-access barrel.
jest.mock('../../data-access-agent-console/src/lib/state/console-live-socket/console-live-socket.effects', () => {
  const { resolveConsoleWebsocketUrl } = jest.requireActual(
    '../../data-access-agent-console/src/lib/state/console-live-socket/console-live-socket-url',
  ) as typeof import('../../data-access-agent-console/src/lib/state/console-live-socket/console-live-socket-url');

  return {
    resolveConsoleWebsocketUrl,
    getConsoleLiveSocketInstance: jest.fn(() => null),
    connectConsoleLiveSocket$: { dispatch: true },
    disconnectConsoleLiveSocket$: { dispatch: true },
    restoreConsoleLiveSocketClient$: { dispatch: false },
    incrementUnreadOnEnvironmentLiveUpsert$: { dispatch: true },
  };
});

// Mock Keycloak to avoid ES module import issues when testing components that use data-access-agent-console
jest.mock('keycloak-js', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('keycloak-angular', () => ({
  KeycloakService: jest.fn(),
  createAuthGuard: jest.fn((impl: unknown) => impl),
}));

setupZoneTestEnv();
