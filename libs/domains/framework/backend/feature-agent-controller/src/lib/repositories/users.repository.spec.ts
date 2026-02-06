import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let mockRepository: jest.Mocked<Repository<UserEntity>>;

  const mockUser: UserEntity = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hashed',
    role: UserRole.USER,
    emailConfirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByIdOrThrow', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      const result = await repository.findByIdOrThrow('user-uuid');
      expect(result).toEqual(mockUser);
    });

    it('should throw when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(repository.findByIdOrThrow('missing')).rejects.toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      const result = await repository.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await repository.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByKeycloakSub', () => {
    it('should return user when found by keycloakSub', async () => {
      const userWithKeycloak = { ...mockUser, keycloakSub: 'keycloak-sub-123' };
      mockRepository.findOne.mockResolvedValue(userWithKeycloak);
      const result = await repository.findByKeycloakSub('keycloak-sub-123');
      expect(result).toEqual(userWithKeycloak);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { keycloakSub: 'keycloak-sub-123' } });
    });

    it('should return null when no user has keycloakSub', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await repository.findByKeycloakSub('unknown-sub');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save user with lowercase email', async () => {
      const created = { ...mockUser, email: 'new@example.com' };
      mockRepository.create.mockReturnValue(created as UserEntity);
      mockRepository.save.mockResolvedValue(created as UserEntity);
      const result = await repository.create({ email: 'NEW@Example.com', passwordHash: 'hash' });
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
      expect(result).toEqual(created);
    });
  });
});
