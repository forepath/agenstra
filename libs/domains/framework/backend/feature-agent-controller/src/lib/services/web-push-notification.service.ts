import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import webpush from 'web-push';

import { readVapidConfigFromEnv } from '../config/vapid.config';
import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

@Injectable()
export class WebPushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(WebPushNotificationService.name);
  private configured = false;

  constructor(private readonly pushSubscriptionsRepository: PushSubscriptionsRepository) {}

  onModuleInit(): void {
    const vapid = readVapidConfigFromEnv();

    if (!vapid) {
      this.logger.warn('Web Push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set');

      return;
    }

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    this.configured = true;
    this.logger.log('Web Push VAPID configured');
  }

  getPublicKey(): string | null {
    return readVapidConfigFromEnv()?.publicKey ?? null;
  }

  isEnabled(): boolean {
    return this.configured;
  }

  async sendToUserIds(userIds: string[], payload: WebPushPayload): Promise<void> {
    if (!this.configured || userIds.length === 0) {
      return;
    }

    const uniqueUserIds = [...new Set(userIds)];
    const subscriptions = await this.pushSubscriptionsRepository.findByUserIds(uniqueUserIds);

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              notification: {
                title: payload.title,
                body: payload.body,
                tag: payload.tag,
              },
              data: {
                url: payload.url,
              },
            }),
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;

          if (statusCode === 404 || statusCode === 410) {
            await this.pushSubscriptionsRepository.deleteById(sub.id);
          } else {
            this.logger.debug(`Push failed for subscription ${sub.id}: ${err}`);
          }
        }
      }),
    );
  }
}
