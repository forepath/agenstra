import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceRefEntity } from '../entities/invoice-ref.entity';

@Injectable()
export class InvoiceRefsRepository {
  constructor(
    @InjectRepository(InvoiceRefEntity)
    private readonly repository: Repository<InvoiceRefEntity>,
  ) {}

  async findBySubscription(subscriptionId: string): Promise<InvoiceRefEntity[]> {
    return await this.repository.find({ where: { subscriptionId }, order: { createdAt: 'DESC' } });
  }

  async findLatestBySubscription(subscriptionId: string): Promise<InvoiceRefEntity | null> {
    return await this.repository.findOne({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: Partial<InvoiceRefEntity>): Promise<InvoiceRefEntity> {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }
}
