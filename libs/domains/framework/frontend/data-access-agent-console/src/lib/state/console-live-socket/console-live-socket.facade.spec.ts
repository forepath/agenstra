import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { setConsoleLiveSocketInstance } from './console-live-socket-instance';
import {
  clearEnvironmentUnread,
  connectConsoleLiveSocket,
  disconnectConsoleLiveSocket,
  setConsoleLiveSocketClient,
} from './console-live-socket.actions';
import { ConsoleLiveSocketFacade } from './console-live-socket.facade';
import {
  selectConsoleLiveSocketConnected,
  selectConsoleLiveSocketConnecting,
  selectConsoleLiveSocketError,
} from './console-live-socket.selectors';

describe('ConsoleLiveSocketFacade', () => {
  let facade: ConsoleLiveSocketFacade;
  let store: { dispatch: jest.Mock; select: jest.Mock };
  let mockSocket: { connected: boolean; emit: jest.Mock };

  beforeEach(() => {
    mockSocket = { connected: true, emit: jest.fn() };
    setConsoleLiveSocketInstance(mockSocket as never);

    store = {
      dispatch: jest.fn(),
      select: jest.fn().mockImplementation((selector: unknown) => {
        if (selector === selectConsoleLiveSocketConnected) {
          return of(true);
        }

        if (selector === selectConsoleLiveSocketConnecting) {
          return of(false);
        }

        if (selector === selectConsoleLiveSocketError) {
          return of(null);
        }

        return of(null);
      }),
    };

    TestBed.configureTestingModule({
      providers: [ConsoleLiveSocketFacade, { provide: Store, useValue: store }],
    });

    facade = TestBed.inject(ConsoleLiveSocketFacade);
  });

  afterEach(() => {
    setConsoleLiveSocketInstance(null);
    jest.clearAllMocks();
  });

  it('connect dispatches connectConsoleLiveSocket', () => {
    facade.connect();

    expect(store.dispatch).toHaveBeenCalledWith(connectConsoleLiveSocket());
  });

  it('disconnect dispatches disconnectConsoleLiveSocket', () => {
    facade.disconnect();

    expect(store.dispatch).toHaveBeenCalledWith(disconnectConsoleLiveSocket());
  });

  it('setClient dispatches and emits when socket is connected', () => {
    facade.setClient('client-1');

    expect(store.dispatch).toHaveBeenCalledWith(setConsoleLiveSocketClient({ clientId: 'client-1' }));
    expect(mockSocket.emit).toHaveBeenCalledWith('setClient', { clientId: 'client-1' });
  });

  it('setClient is a no-op when socket is disconnected', () => {
    mockSocket.connected = false;

    facade.setClient('client-1');

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('ensureConnectedAndSetClient sets client when already connected', (done) => {
    facade.ensureConnectedAndSetClient('client-1').subscribe(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('setClient', { clientId: 'client-1' });
      done();
    });
  });

  it('clearUnread dispatches clearEnvironmentUnread', () => {
    facade.clearUnread('c1', 'a1');

    expect(store.dispatch).toHaveBeenCalledWith(clearEnvironmentUnread({ clientId: 'c1', agentId: 'a1' }));
  });
});
