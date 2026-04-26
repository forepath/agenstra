import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AgentMessageEventEntity } from '../entities/agent-message-event.entity';

@Injectable()
export class AgentMessageEventsRepository {
  constructor(
    @InjectRepository(AgentMessageEventEntity)
    private readonly repository: Repository<AgentMessageEventEntity>,
  ) {}

  async create(
    entity: Omit<AgentMessageEventEntity, 'id' | 'agent' | 'createdAt' | 'updatedAt'>,
  ): Promise<AgentMessageEventEntity> {
    const created = this.repository.create(entity);

    return await this.repository.save(created);
  }
}
