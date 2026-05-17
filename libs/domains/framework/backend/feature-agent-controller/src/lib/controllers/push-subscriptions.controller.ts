import { getUserFromRequest, type RequestWithUser } from '@forepath/identity/backend';
import { BadRequestException, Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';

import {
  RegisterPushSubscriptionDto,
  UnregisterPushSubscriptionDto,
  VapidPublicKeyResponseDto,
} from '../dto/push-subscription.dto';
import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';
import { WebPushNotificationService } from '../services/web-push-notification.service';

@Controller('push')
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsRepository: PushSubscriptionsRepository,
    private readonly webPushNotificationService: WebPushNotificationService,
  ) {}

  @Get('vapid-public-key')
  getVapidPublicKey(): VapidPublicKeyResponseDto {
    const publicKey = this.webPushNotificationService.getPublicKey();

    return {
      publicKey: publicKey ?? '',
      enabled: !!publicKey && this.webPushNotificationService.isEnabled(),
    };
  }

  @Post('subscriptions')
  async register(@Body() dto: RegisterPushSubscriptionDto, @Req() req: RequestWithUser): Promise<{ registered: true }> {
    const userInfo = getUserFromRequest(req);

    if (userInfo.isApiKeyAuth || !userInfo.userId) {
      throw new BadRequestException('Push subscriptions require a user account');
    }

    await this.pushSubscriptionsRepository.upsert({
      userId: userInfo.userId,
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
      userAgent: dto.userAgent,
    });

    return { registered: true };
  }

  @Delete('subscriptions')
  async unregister(
    @Body() dto: UnregisterPushSubscriptionDto,
    @Req() req: RequestWithUser,
  ): Promise<{ removed: true }> {
    const userInfo = getUserFromRequest(req);

    if (!userInfo.userId) {
      throw new BadRequestException('Unauthorized');
    }

    await this.pushSubscriptionsRepository.deleteByUserAndEndpoint(userInfo.userId, dto.endpoint);

    return { removed: true };
  }
}
