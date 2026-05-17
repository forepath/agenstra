import type { Socket } from 'socket.io-client';

let consoleLiveSocketInstance: Socket | null = null;

export function getConsoleLiveSocketInstance(): Socket | null {
  return consoleLiveSocketInstance;
}

export function setConsoleLiveSocketInstance(socket: Socket | null): void {
  consoleLiveSocketInstance = socket;
}
