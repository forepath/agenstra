jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

import webpush from 'web-push';

import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';

import { WebPushNotificationService } from './web-push-notification.service';

describe('WebPushNotificationService', () => {
  const originalEnv = process.env;
  let service: WebPushNotificationService;
  const pushSubscriptionsRepository = {
    findByUserIds: jest.fn(),
    deleteById: jest.fn(),
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      VAPID_PUBLIC_KEY: 'public',
      VAPID_PRIVATE_KEY: 'private',
      VAPID_SUBJECT: 'mailto:test@example.com',
    };
    jest.clearAllMocks();

    service = new WebPushNotificationService(pushSubscriptionsRepository as unknown as PushSubscriptionsRepository);
    service.onModuleInit();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('configures VAPID on module init', () => {
    expect(webpush.setVapidDetails).toHaveBeenCalledWith('mailto:test@example.com', 'public', 'private');
    expect(service.isEnabled()).toBe(true);
    expect(service.getPublicKey()).toBe('public');
  });

  it('sendToUserIds does nothing when disabled', async () => {
    const disabled = new WebPushNotificationService(
      pushSubscriptionsRepository as unknown as PushSubscriptionsRepository,
    );

    await disabled.sendToUserIds(['u1'], { title: 't', body: 'b' });

    expect(pushSubscriptionsRepository.findByUserIds).not.toHaveBeenCalled();
  });

  it('sendToUserIds sends notifications to subscriptions', async () => {
    pushSubscriptionsRepository.findByUserIds.mockResolvedValue([
      { id: 's1', endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

    await service.sendToUserIds(['u1'], { title: 'Hello', body: 'World', url: '/clients/c1/agents/a1' });

    expect(webpush.sendNotification).toHaveBeenCalled();
  });

  it('sendToUserIds deletes expired subscriptions on 410', async () => {
    pushSubscriptionsRepository.findByUserIds.mockResolvedValue([
      { id: 's1', endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' },
    ]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410 });

    await service.sendToUserIds(['u1'], { title: 'Hello', body: 'World' });

    expect(pushSubscriptionsRepository.deleteById).toHaveBeenCalledWith('s1');
  });
});
