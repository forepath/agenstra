import { EventEmitter } from 'node:events';

import { createCorrelationAwareSocketIoClient } from '@forepath/framework/backend/util-http-context';

import { ConsoleLiveAgentWatch, type ConsoleLiveAgentWatchCallbacks } from './console-live-agent-watch';

jest.mock('@forepath/framework/backend/util-http-context', () => ({
  createCorrelationAwareSocketIoClient: jest.fn(),
}));

type MockRemote = EventEmitter & {
  onAny: jest.Mock;
  emit: jest.Mock;
  removeAllListeners: jest.Mock;
  disconnect: jest.Mock;
};

describe('ConsoleLiveAgentWatch', () => {
  let remote: MockRemote;
  let onAnyHandler: (event: string, ...args: unknown[]) => void;
  const callbacks: ConsoleLiveAgentWatchCallbacks = {
    onChatMessage: jest.fn(),
    onChatEvent: jest.fn(),
    onFileUpdateNotification: jest.fn(),
    onDisconnected: jest.fn(),
  };
  const createWatch = (): ConsoleLiveAgentWatch =>
    new ConsoleLiveAgentWatch(
      'client-1',
      'agent-1',
      'https://example.com/agents',
      'Bearer token',
      'secret',
      true,
      callbacks,
    );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    remote = new EventEmitter() as MockRemote;
    remote.onAny = jest.fn((handler: (event: string, ...args: unknown[]) => void) => {
      onAnyHandler = handler;
    });
    remote.emit = jest.fn((event: string, ...args: unknown[]) => {
      if (event === 'login') {
        remote.emit('loginSuccess');
      }

      return EventEmitter.prototype.emit.call(remote, event, ...args);
    });
    remote.removeAllListeners = jest.fn(() => EventEmitter.prototype.removeAllListeners.call(remote));
    remote.disconnect = jest.fn();

    jest.mocked(createCorrelationAwareSocketIoClient).mockReturnValue(remote as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const connectAndLogin = async (watch: ConsoleLiveAgentWatch): Promise<void> => {
    const startPromise = watch.start();

    remote.emit('connect');
    await Promise.resolve();
    await startPromise;
  };

  it('connects, logs in, and forwards socket events to callbacks', async () => {
    const watch = createWatch();

    await connectAndLogin(watch);

    onAnyHandler('chatMessage', { text: 'hi' });
    onAnyHandler('chatEvent', { type: 'stream' });
    onAnyHandler('fileUpdateNotification');

    expect(createCorrelationAwareSocketIoClient).toHaveBeenCalledWith(
      'https://example.com/agents',
      expect.objectContaining({
        extraHeaders: { Authorization: 'Bearer token' },
        rejectUnauthorized: true,
      }),
    );
    expect(callbacks.onChatMessage).toHaveBeenCalledWith({ text: 'hi' });
    expect(callbacks.onChatEvent).toHaveBeenCalledWith({ type: 'stream' });
    expect(callbacks.onFileUpdateNotification).toHaveBeenCalled();
  });

  it('rejects when connection times out', async () => {
    const watch = createWatch();
    const startPromise = watch.start();

    jest.advanceTimersByTime(15_001);

    await expect(startPromise).rejects.toThrow('Console live watch connection timeout');
  });

  it('rejects when login fails', async () => {
    remote.emit = jest.fn((event: string, ...args: unknown[]) => {
      if (event === 'login') {
        remote.emit('loginError', { error: { message: 'bad credentials' } });
      }

      return EventEmitter.prototype.emit.call(remote, event, ...args);
    });

    const watch = createWatch();
    const startPromise = watch.start();

    remote.emit('connect');
    await Promise.resolve();

    await expect(startPromise).rejects.toThrow('bad credentials');
  });

  it('stop disconnects and ignores events while stopping', async () => {
    const watch = createWatch();

    await connectAndLogin(watch);
    await watch.stop();

    onAnyHandler('chatMessage', { ignored: true });
    remote.emit('disconnect');

    expect(remote.disconnect).toHaveBeenCalled();
    expect(callbacks.onChatMessage).not.toHaveBeenCalled();
    expect(callbacks.onDisconnected).not.toHaveBeenCalled();
  });

  it('notifies on disconnect when not stopping', async () => {
    const watch = createWatch();

    await connectAndLogin(watch);
    remote.emit('disconnect');

    expect(callbacks.onDisconnected).toHaveBeenCalled();
  });
});
