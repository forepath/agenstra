import { ConsoleLiveObserverService } from '../services/console-live-observer.service';

export function createConsoleLiveObserverServiceMock(): Pick<
  ConsoleLiveObserverService,
  | 'ensureObserving'
  | 'releaseObserving'
  | 'getSnapshotForClient'
  | 'notifyAutomationRunFromDto'
  | 'notePendingUserChatOrigin'
  | 'invalidateVcs'
> {
  return {
    ensureObserving: jest.fn(),
    releaseObserving: jest.fn(),
    getSnapshotForClient: jest.fn().mockReturnValue([]),
    notifyAutomationRunFromDto: jest.fn(),
    notePendingUserChatOrigin: jest.fn(),
    invalidateVcs: jest.fn(),
  };
}

export function provideConsoleLiveObserverServiceMock(): {
  provide: typeof ConsoleLiveObserverService;
  useValue: ReturnType<typeof createConsoleLiveObserverServiceMock>;
} {
  return {
    provide: ConsoleLiveObserverService,
    useValue: createConsoleLiveObserverServiceMock(),
  };
}
