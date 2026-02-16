import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  async findByIdOrThrow(id: string): Promise<SubscriptionEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return entity;
  }

  async findById(id: string): Promise<SubscriptionEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findAllByUser(userId: string, limit = 10, offset = 0): Promise<SubscriptionEntity[]> {
    return await this.repository.find({
      where: { userId },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async update(id: string, dto: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const entity = await this.findByIdOrThrow(id);
    Object.assign(entity, dto);
    return await this.repository.save(entity);
  }
}
