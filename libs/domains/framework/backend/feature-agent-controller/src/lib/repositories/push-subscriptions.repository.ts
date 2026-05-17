import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PushSubscriptionEntity } from '../entities/push-subscription.entity';
import { hashPushSubscriptionEndpoint } from '../utils/push-subscription-endpoint-hash';

export interface CreatePushSubscriptionInput {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

@Injectable()
export class PushSubscriptionsRepository {
  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repository: Repository<PushSubscriptionEntity>,
  ) {}

  async upsert(input: CreatePushSubscriptionInput): Promise<PushSubscriptionEntity> {
    const endpointHash = hashPushSubscriptionEndpoint(input.endpoint);
    const existing = await this.repository.findOne({
      where: { userId: input.userId, endpointHash },
    });

    if (existing) {
      existing.endpoint = input.endpoint;
      existing.p256dh = input.p256dh;
      existing.auth = input.auth;
      existing.userAgent = input.userAgent ?? null;

      return await this.repository.save(existing);
    }

    const entity = this.repository.create({
      ...input,
      endpointHash,
    });

    return await this.repository.save(entity);
  }

  async deleteByUserAndEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.repository.delete({
      userId,
      endpointHash: hashPushSubscriptionEndpoint(endpoint),
    });
  }

  async findByUserId(userId: string): Promise<PushSubscriptionEntity[]> {
    return await this.repository.find({ where: { userId } });
  }

  async findByUserIds(userIds: string[]): Promise<PushSubscriptionEntity[]> {
    if (userIds.length === 0) {
      return [];
    }

    return await this.repository.createQueryBuilder('ps').where('ps.user_id IN (:...userIds)', { userIds }).getMany();
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
