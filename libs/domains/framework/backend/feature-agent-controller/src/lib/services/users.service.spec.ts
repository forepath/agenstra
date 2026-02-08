import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../dto/auth/create-user.dto';
import { UpdateUserDto } from '../dto/auth/update-user.dto';
import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { EmailService } from './email.service';
import { StatisticsService } from './statistics.service';
import { UsersService } from './users.service';

jest.mock('bcrypt');

const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: jest.Mocked<Pick<UsersRepository, keyof UsersRepository>>;
  let mockEmailService: jest.Mocked<Pick<EmailService, 'sendConfirmationEmail'>>;

  const mockUser: UserEntity = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    emailConfirmedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as UserEntity;

  beforeEach(async () => {
    mockRepository = {
      count: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as never;
    mockEmailService = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(true),
    } as never;

    const mockStatisticsService = {
      recordEntityCreated: jest.fn().mockResolvedValue(undefined),
      recordEntityUpdated: jest.fn().mockResolvedValue(undefined),
      recordEntityDeleted: jest.fn().mockResolvedValue(undefined),
    } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
        { provide: EmailService, useValue: mockEmailService },
        { provide: StatisticsService, useValue: mockStatisticsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    mockBcryptHash.mockResolvedValue('hashed' as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapToResponseDto', () => {
    it('should map UserEntity to UserResponseDto', async () => {
      const result = await service.mapToResponseDto(mockUser);
      expect(result).toEqual({
        id: 'user-uuid',
        email: 'test@example.com',
        role: UserRole.USER,
        emailConfirmedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle user without emailConfirmedAt', async () => {
      const userWithoutConfirm = { ...mockUser, emailConfirmedAt: undefined };
      const result = await service.mapToResponseDto(userWithoutConfirm);
      expect(result.emailConfirmedAt).toBeUndefined();
    });
  });

  describe('getUsersCount', () => {
    it('should return count from repository', async () => {
      mockRepository.count.mockResolvedValue(5);
      const result = await service.getUsersCount();
      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return mapped users with default limit and offset', async () => {
      mockRepository.findAll.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'user-uuid', email: 'test@example.com' });
      expect(mockRepository.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('should pass custom limit and offset', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      await service.findAll(20, 5);
      expect(mockRepository.findAll).toHaveBeenCalledWith(20, 5);
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      const result = await service.findOne('user-uuid');
      expect(result).toMatchObject({ id: 'user-uuid', email: 'test@example.com' });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing')).rejects.toThrow('User not found');
    });
  });

  describe('create', () => {
    it('should create user and send confirmation email when not first user', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const created = { ...mockUser, email: 'new@example.com' };
      mockRepository.create.mockResolvedValue(created);
      mockRepository.update.mockResolvedValue(created);

      const dto: CreateUserDto = { email: 'new@example.com', password: 'password123' };
      const result = await service.create(dto, false);

      expect(mockBcryptHash).toHaveBeenCalledWith('password123', 12);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          passwordHash: 'hashed',
          role: UserRole.USER,
          emailConfirmedAt: undefined,
        }),
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-uuid',
        expect.objectContaining({ emailConfirmationToken: expect.any(String) }),
      );
      expect(mockEmailService.sendConfirmationEmail).toHaveBeenCalledWith('new@example.com', expect.any(String));
      expect(result).toMatchObject({ id: 'user-uuid', email: 'new@example.com' });
    });

    it('should assign ADMIN role for first user and not send confirmation email', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const created = { ...mockUser, role: UserRole.ADMIN };
      mockRepository.create.mockResolvedValue(created);

      const dto: CreateUserDto = { email: 'admin@example.com', password: 'password123' };
      await service.create(dto, true);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.ADMIN,
          emailConfirmedAt: expect.any(Date),
        }),
      );
      expect(mockEmailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should use dto role when provided', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const created = { ...mockUser, role: UserRole.ADMIN };
      mockRepository.create.mockResolvedValue(created);

      const dto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
      };
      await service.create(dto, false);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.ADMIN }));
    });

    it('should throw ConflictException when email already exists', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);

      const dto: CreateUserDto = { email: 'test@example.com', password: 'password123' };
      await expect(service.create(dto, false)).rejects.toThrow(ConflictException);
      await expect(service.create(dto, false)).rejects.toThrow('User with this email already exists');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user and send confirmation email when email changes', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.findByEmail.mockResolvedValue(null);
      const updated = { ...mockUser, email: 'updated@example.com' };
      mockRepository.update.mockResolvedValue(updated);

      const dto: UpdateUserDto = { email: 'updated@example.com' };
      const result = await service.update('user-uuid', dto);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-uuid',
        expect.objectContaining({
          email: 'updated@example.com',
          emailConfirmedAt: null,
          emailConfirmationToken: expect.any(String),
        }),
      );
      expect(mockEmailService.sendConfirmationEmail).toHaveBeenCalledWith('updated@example.com', expect.any(String));
      expect(result).toMatchObject({ email: 'updated@example.com' });
    });

    it('should update user without confirmation when only role changes', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      const updated = { ...mockUser, role: UserRole.ADMIN };
      mockRepository.update.mockResolvedValue(updated);

      const dto: UpdateUserDto = { role: UserRole.ADMIN };
      await service.update('user-uuid', dto);

      expect(mockRepository.update).toHaveBeenCalledWith('user-uuid', { role: UserRole.ADMIN });
      expect(mockEmailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should update password when provided', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(mockUser);

      const dto: UpdateUserDto = { password: 'newpassword123' };
      await service.update('user-uuid', dto);

      expect(mockBcryptHash).toHaveBeenCalledWith('newpassword123', 12);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'user-uuid',
        expect.objectContaining({ passwordHash: 'hashed' }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const dto: UpdateUserDto = { email: 'updated@example.com' };
      await expect(service.update('missing', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update('missing', dto)).rejects.toThrow('User not found');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new email already exists', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        id: 'other-uuid',
        email: 'taken@example.com',
      });

      const dto: UpdateUserDto = { email: 'taken@example.com' };
      await expect(service.update('user-uuid', dto)).rejects.toThrow(ConflictException);
      await expect(service.update('user-uuid', dto)).rejects.toThrow('User with this email already exists');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should allow keeping same email (case insensitive) without confirmation', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockUser, email: 'test@example.com' });
      mockRepository.update.mockResolvedValue(mockUser);

      const dto: UpdateUserDto = { email: 'TEST@example.com' };
      await service.update('user-uuid', dto);

      expect(mockRepository.update).toHaveBeenCalledWith('user-uuid', {
        email: 'TEST@example.com',
      });
      expect(mockEmailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove user when found', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(undefined);

      await service.remove('user-uuid');

      expect(mockRepository.remove).toHaveBeenCalledWith('user-uuid');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      await expect(service.remove('missing')).rejects.toThrow('User not found');
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should return true when password matches', async () => {
      mockBcryptCompare.mockResolvedValue(true as never);
      const result = await service.validatePassword('password', 'hash');
      expect(result).toBe(true);
      expect(mockBcryptCompare).toHaveBeenCalledWith('password', 'hash');
    });

    it('should return false when password does not match', async () => {
      mockBcryptCompare.mockResolvedValue(false as never);
      const result = await service.validatePassword('wrong', 'hash');
      expect(result).toBe(false);
    });
  });
});
