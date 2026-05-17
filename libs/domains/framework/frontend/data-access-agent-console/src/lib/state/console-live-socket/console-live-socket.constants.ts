/** Socket.IO event names on the `console` namespace (server → client). */
export const CONSOLE_LIVE_SOCKET_EVENTS = {
  environmentStateUpsert: 'environmentStateUpsert',
  environmentStateRemoved: 'environmentStateRemoved',
} as const;
