import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';

import { PushNotificationsService } from './push-notifications.service';

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('PushNotificationsService', () => {
  const apiUrl = 'http://localhost:3100/api';
  const vapidPublicKey = 'BNxVapidPublicKeyExample';
  let service: PushNotificationsService;
  let httpMock: HttpTestingController;
  let swPush: {
    isEnabled: boolean;
    requestSubscription: jest.Mock;
  };

  function configureTestBed(environment: {
    controller: { restApiUrl: string };
    push?: { vapidPublicKey: string };
  }): void {
    swPush = {
      isEnabled: true,
      requestSubscription: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PushNotificationsService,
        { provide: SwPush, useValue: swPush },
        { provide: ENVIRONMENT, useValue: environment },
      ],
    });

    service = TestBed.inject(PushNotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
    configureTestBed({
      controller: { restApiUrl: apiUrl },
      push: { vapidPublicKey },
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isSupported', () => {
    it('returns true when SwPush is enabled', () => {
      expect(service.isSupported()).toBe(true);
    });

    it('returns false when SwPush is disabled', () => {
      swPush.isEnabled = false;

      expect(service.isSupported()).toBe(false);
    });
  });

  describe('shouldShowOptInPrompt', () => {
    it('returns false when push is not supported', () => {
      swPush.isEnabled = false;

      expect(service.shouldShowOptInPrompt()).toBe(false);
    });

    it('returns true when supported and user has not opted in or declined', () => {
      expect(service.shouldShowOptInPrompt()).toBe(true);
    });

    it('returns false after user opted in', () => {
      localStorage.setItem('agent-console-push-opt-in', 'true');

      expect(service.shouldShowOptInPrompt()).toBe(false);
    });

    it('returns false after user declined', () => {
      localStorage.setItem('agent-console-push-declined', 'true');

      expect(service.shouldShowOptInPrompt()).toBe(false);
    });
  });

  describe('declineOptIn', () => {
    it('persists declined flag in localStorage', () => {
      service.declineOptIn();

      expect(localStorage.getItem('agent-console-push-declined')).toBe('true');
    });
  });

  describe('subscribeFromUserGesture', () => {
    it('returns false when SwPush is disabled', async () => {
      swPush.isEnabled = false;

      await expect(service.subscribeFromUserGesture()).resolves.toBe(false);
    });

    it('returns false when subscription json is invalid', async () => {
      swPush.requestSubscription.mockResolvedValue({
        toJSON: () => ({ endpoint: 'https://push.example/sub/1' }),
      });

      await expect(service.subscribeFromUserGesture()).resolves.toBe(false);
      expect(swPush.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: vapidPublicKey });
    });

    it('registers subscription and marks opt-in on success', async () => {
      swPush.requestSubscription.mockResolvedValue({
        toJSON: () => ({
          endpoint: 'https://push.example/sub/42',
          keys: { p256dh: 'p256', auth: 'auth-secret' },
        }),
      });

      const subscribed = service.subscribeFromUserGesture();

      await flushAsyncWork();

      const req = httpMock.expectOne(`${apiUrl}/push/subscriptions`);

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        endpoint: 'https://push.example/sub/42',
        p256dh: 'p256',
        auth: 'auth-secret',
        userAgent: navigator.userAgent,
      });
      req.flush({ registered: true });

      await expect(subscribed).resolves.toBe(true);
      expect(localStorage.getItem('agent-console-push-opt-in')).toBe('true');
      expect(localStorage.getItem('agent-console-push-declined')).toBeNull();
    });
  });

  describe('without environment VAPID public key', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      localStorage.clear();
      configureTestBed({
        controller: { restApiUrl: apiUrl },
      });
    });

    it('fetches VAPID key from API before subscribing', async () => {
      swPush.requestSubscription.mockResolvedValue({
        toJSON: () => ({
          endpoint: 'https://push.example/sub/99',
          keys: { p256dh: 'p', auth: 'a' },
        }),
      });

      const subscribed = service.subscribeFromUserGesture();
      const vapidReq = httpMock.expectOne(`${apiUrl}/push/vapid-public-key`);

      expect(vapidReq.request.method).toBe('GET');
      vapidReq.flush({ publicKey: 'from-api', enabled: true });

      await flushAsyncWork();

      const registerReq = httpMock.expectOne(`${apiUrl}/push/subscriptions`);

      registerReq.flush({ registered: true });

      await expect(subscribed).resolves.toBe(true);
      expect(swPush.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: 'from-api' });
    });

    it('returns false when API VAPID key fetch fails', async () => {
      const subscribed = service.subscribeFromUserGesture();
      const vapidReq = httpMock.expectOne(`${apiUrl}/push/vapid-public-key`);

      vapidReq.error(new ProgressEvent('error'));

      await expect(subscribed).resolves.toBe(false);
      httpMock.expectNone(`${apiUrl}/push/subscriptions`);
      expect(swPush.requestSubscription).not.toHaveBeenCalled();
    });
  });
});
