import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { OpenPositionEntity } from '../entities/open-position.entity';

@Injectable()
export class OpenPositionsRepository {
  constructor(
    @InjectRepository(OpenPositionEntity)
    private readonly repository: Repository<OpenPositionEntity>,
  ) {}

  async create(dto: Partial<OpenPositionEntity>): Promise<OpenPositionEntity> {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async findUnbilledByUserId(userId: string): Promise<OpenPositionEntity[]> {
    return await this.repository.find({
      where: { userId, invoiceRefId: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async markBilled(id: string, invoiceRefId: string): Promise<OpenPositionEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Open position ${id} not found`);
    }
    entity.invoiceRefId = invoiceRefId;
    return await this.repository.save(entity);
  }
}
