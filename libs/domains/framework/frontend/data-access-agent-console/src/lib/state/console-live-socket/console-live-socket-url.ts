import type { Environment } from '@forepath/framework/frontend/util-configuration';

export function resolveConsoleWebsocketUrl(environment: Environment): string | null {
  const explicit = environment.controller.consoleWebsocketUrl?.trim();

  if (explicit) {
    return explicit;
  }

  const base = environment.controller.websocketUrl?.trim();

  if (!base) {
    return null;
  }

  if (base.endsWith('/clients')) {
    return `${base.slice(0, -'/clients'.length)}/console`;
  }

  try {
    const u = new URL(base);
    const root = `${u.protocol}//${u.host}`;

    return `${root}/console`;
  } catch {
    return `${base.replace(/\/$/, '')}/console`;
  }
}
