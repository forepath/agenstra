import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { ENVIRONMENT, type Environment } from '@forepath/framework/frontend/util-configuration';
import { catchError, firstValueFrom, of } from 'rxjs';

import { parsePushSubscriptionPayload } from './push-subscription-json';

const PUSH_OPT_IN_KEY = 'agent-console-push-opt-in';
const PUSH_DECLINED_KEY = 'agent-console-push-declined';

interface VapidPublicKeyResponse {
  publicKey: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush, { optional: true });
  private readonly environment = inject<Environment>(ENVIRONMENT);

  isSupported(): boolean {
    return !!this.swPush?.isEnabled;
  }

  shouldShowOptInPrompt(): boolean {
    if (!this.isSupported()) {
      return false;
    }

    if (typeof localStorage === 'undefined') {
      return false;
    }

    if (localStorage.getItem(PUSH_OPT_IN_KEY) === 'true') {
      return false;
    }

    return localStorage.getItem(PUSH_DECLINED_KEY) !== 'true';
  }

  declineOptIn(): void {
    localStorage.setItem(PUSH_DECLINED_KEY, 'true');
  }

  async subscribeFromUserGesture(): Promise<boolean> {
    if (!this.swPush?.isEnabled) {
      return false;
    }

    const vapid = await this.fetchVapidPublicKey();

    if (!vapid.enabled || !vapid.publicKey) {
      return false;
    }

    const subscription = await this.swPush.requestSubscription({
      serverPublicKey: vapid.publicKey,
    });
    const payload = parsePushSubscriptionPayload(subscription.toJSON());

    if (!payload) {
      return false;
    }

    await firstValueFrom(
      this.http.post(`${this.environment.controller.restApiUrl}/push/subscriptions`, {
        endpoint: payload.endpoint,
        p256dh: payload.p256dh,
        auth: payload.auth,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    );

    localStorage.setItem(PUSH_OPT_IN_KEY, 'true');
    localStorage.removeItem(PUSH_DECLINED_KEY);

    return true;
  }

  private fetchVapidPublicKey(): Promise<VapidPublicKeyResponse> {
    const configured = this.environment.push?.vapidPublicKey?.trim();

    if (configured) {
      return Promise.resolve({ publicKey: configured, enabled: true });
    }

    return firstValueFrom(
      this.http
        .get<VapidPublicKeyResponse>(`${this.environment.controller.restApiUrl}/push/vapid-public-key`)
        .pipe(catchError(() => of({ publicKey: '', enabled: false }))),
    );
  }
}
