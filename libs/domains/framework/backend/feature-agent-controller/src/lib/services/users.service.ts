import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../dto/auth/create-user.dto';
import { UpdateUserDto } from '../dto/auth/update-user.dto';
import { UserResponseDto } from '../dto/auth/user-response.dto';
import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { createTokenWithUserId } from '../utils/token.utils';
import { EmailService } from './email.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
  ) {}

  async mapToResponseDto(user: UserEntity): Promise<UserResponseDto> {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailConfirmedAt: user.emailConfirmedAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getUsersCount(): Promise<number> {
    return this.usersRepository.count();
  }

  async findAll(limit = 10, offset = 0): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findAll(limit, offset);
    return Promise.all(users.map((u) => this.mapToResponseDto(u)));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  async create(dto: CreateUserDto, isFirstUser: boolean): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const role = dto.role ?? (isFirstUser ? UserRole.ADMIN : UserRole.USER);

    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
      role,
      emailConfirmedAt: isFirstUser ? new Date() : undefined,
      emailConfirmationToken: undefined,
    });

    if (!isFirstUser) {
      const { token, hash } = createTokenWithUserId(user.id);
      const tokenHash = await hash;
      await this.usersRepository.update(user.id, { emailConfirmationToken: tokenHash });
      await this.emailService.sendConfirmationEmail(user.email, token);
    }

    return this.mapToResponseDto(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const emailChanged = dto.email && dto.email.toLowerCase() !== user.email;
    if (emailChanged) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updateData: Partial<UserEntity> = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    let confirmationToken: string | undefined;
    if (emailChanged && dto.email) {
      const { token, hash } = createTokenWithUserId(id);
      const tokenHash = await hash;
      updateData.emailConfirmedAt = null as unknown as Date;
      updateData.emailConfirmationToken = tokenHash;
      confirmationToken = token;
    }

    const updated = await this.usersRepository.update(id, updateData);

    if (emailChanged && dto.email && confirmationToken) {
      await this.emailService.sendConfirmationEmail(dto.email, confirmationToken);
    }

    return this.mapToResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.remove(id);
  }

  async validatePassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
