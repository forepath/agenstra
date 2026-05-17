jest.mock('@forepath/identity/backend', () => {
  const actual = jest.requireActual('@forepath/identity/backend');

  return {
    ...actual,
    getUserFromRequest: jest.fn(),
  };
});

import * as identityBackend from '@forepath/identity/backend';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';
import { WebPushNotificationService } from '../services/web-push-notification.service';

import { PushSubscriptionsController } from './push-subscriptions.controller';

describe('PushSubscriptionsController', () => {
  let controller: PushSubscriptionsController;
  const pushSubscriptionsRepository = {
    upsert: jest.fn(),
    deleteByUserAndEndpoint: jest.fn(),
  };
  const webPushNotificationService = {
    getPublicKey: jest.fn().mockReturnValue('public-key'),
    isEnabled: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushSubscriptionsController],
      providers: [
        { provide: PushSubscriptionsRepository, useValue: pushSubscriptionsRepository },
        { provide: WebPushNotificationService, useValue: webPushNotificationService },
      ],
    }).compile();

    controller = module.get(PushSubscriptionsController);
    jest.clearAllMocks();
  });

  it('returns VAPID public key and enabled flag', () => {
    expect(controller.getVapidPublicKey()).toEqual({ publicKey: 'public-key', enabled: true });
  });

  it('register upserts subscription for authenticated user', async () => {
    (identityBackend.getUserFromRequest as jest.Mock).mockReturnValue({
      isApiKeyAuth: false,
      userId: 'user-1',
    });

    await expect(
      controller.register(
        {
          endpoint: 'https://push.example/sub',
          p256dh: 'p',
          auth: 'a',
        },
        {} as never,
      ),
    ).resolves.toEqual({ registered: true });

    expect(pushSubscriptionsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', endpoint: 'https://push.example/sub' }),
    );
  });

  it('register rejects API key auth', async () => {
    (identityBackend.getUserFromRequest as jest.Mock).mockReturnValue({ isApiKeyAuth: true });

    await expect(
      controller.register({ endpoint: 'https://push.example/sub', p256dh: 'p', auth: 'a' }, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unregister deletes subscription for user', async () => {
    (identityBackend.getUserFromRequest as jest.Mock).mockReturnValue({ isApiKeyAuth: false, userId: 'user-1' });

    await expect(controller.unregister({ endpoint: 'https://push.example/sub' }, {} as never)).resolves.toEqual({
      removed: true,
    });

    expect(pushSubscriptionsRepository.deleteByUserAndEndpoint).toHaveBeenCalledWith(
      'user-1',
      'https://push.example/sub',
    );
  });

  it('unregister rejects missing user id', async () => {
    (identityBackend.getUserFromRequest as jest.Mock).mockReturnValue({ isApiKeyAuth: false });

    await expect(controller.unregister({ endpoint: 'https://push.example/sub' }, {} as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
