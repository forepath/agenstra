import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findByIdOrThrow(id: string): Promise<UserEntity> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    return user;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByKeycloakSub(keycloakSub: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { keycloakSub } });
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async findAll(limit = 10, offset = 0): Promise<UserEntity[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get all user ids and roles for statistics mirror sync.
   * Returns minimal data for efficient batch processing.
   */
  async findAllIdsAndRoles(): Promise<{ id: string; role: string }[]> {
    return this.repository.find({
      select: ['id', 'role'],
    });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repository.create({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.repository.update(id, {
      ...data,
      ...(data.email && { email: data.email.toLowerCase() }),
    });
    return this.findByIdOrThrow(id);
  }

  async updateRole(id: string, role: UserRole): Promise<UserEntity> {
    await this.repository.update(id, { role });
    return this.findByIdOrThrow(id);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
