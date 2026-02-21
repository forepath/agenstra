import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionItemEntity } from '../entities/subscription-item.entity';

@Injectable()
export class SubscriptionItemsRepository {
  constructor(
    @InjectRepository(SubscriptionItemEntity)
    private readonly repository: Repository<SubscriptionItemEntity>,
  ) {}

  async create(dto: Partial<SubscriptionItemEntity>): Promise<SubscriptionItemEntity> {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async updateProviderReference(id: string, providerReference: string): Promise<SubscriptionItemEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Subscription item ${id} not found`);
    }
    entity.providerReference = providerReference;
    return await this.repository.save(entity);
  }

  async updateProvisioningStatus(id: string, status: 'pending' | 'active' | 'failed'): Promise<SubscriptionItemEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Subscription item ${id} not found`);
    }
    entity.provisioningStatus = status as any;
    return await this.repository.save(entity);
  }

  async findBySubscription(subscriptionId: string): Promise<SubscriptionItemEntity[]> {
    return await this.repository.find({ where: { subscriptionId } });
  }
}
