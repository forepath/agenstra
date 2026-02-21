import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CreateUserDto } from '../dto/auth/create-user.dto';
import { UpdateUserDto } from '../dto/auth/update-user.dto';
import { UserRole } from '../entities/user.entity';
import { UsersAuthGuard } from '../guards/users-auth.guard';
import { UsersService } from '../services/users.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUserResponse = {
    id: 'test-user-uuid',
    email: 'test@example.com',
    role: UserRole.USER,
    emailConfirmedAt: undefined,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAdminUserResponse = {
    id: 'admin-user-uuid',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    emailConfirmedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getUsersCount: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
    sign: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        UsersAuthGuard,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return array of users with default pagination', async () => {
      const users = [mockUserResponse, mockAdminUserResponse];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('should return array of users with custom limit', async () => {
      const users = [mockUserResponse];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll(5);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(5, 0);
    });

    it('should return array of users with custom offset', async () => {
      const users = [mockAdminUserResponse];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll(undefined, 10);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(10, 10);
    });

    it('should return array of users with custom limit and offset', async () => {
      const users = [mockUserResponse];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll(20, 5);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(20, 5);
    });

    it('should return empty array when no users exist', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('should handle large limit values', async () => {
      const users = [mockUserResponse, mockAdminUserResponse];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll(1000);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(1000, 0);
    });

    it('should handle large offset values', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(10, 500);

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith(10, 500);
    });
  });

  describe('findOne', () => {
    it('should return single user by id', async () => {
      service.findOne.mockResolvedValue(mockUserResponse);

      const result = await controller.findOne('test-user-uuid');

      expect(result).toEqual(mockUserResponse);
      expect(service.findOne).toHaveBeenCalledWith('test-user-uuid');
    });

    it('should return admin user by id', async () => {
      service.findOne.mockResolvedValue(mockAdminUserResponse);

      const result = await controller.findOne('admin-user-uuid');

      expect(result).toEqual(mockAdminUserResponse);
      expect(service.findOne).toHaveBeenCalledWith('admin-user-uuid');
    });

    it('should handle user with confirmed email', async () => {
      const confirmedUser = {
        ...mockUserResponse,
        emailConfirmedAt: '2024-01-01T12:00:00.000Z',
      };
      service.findOne.mockResolvedValue(confirmedUser);

      const result = await controller.findOne('test-user-uuid');

      expect(result).toEqual(confirmedUser);
      expect(result.emailConfirmedAt).toBe('2024-01-01T12:00:00.000Z');
      expect(service.findOne).toHaveBeenCalledWith('test-user-uuid');
    });
  });

  describe('create', () => {
    it('should create new user when users exist (not first user)', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        role: UserRole.USER,
      };

      const newUser = {
        ...mockUserResponse,
        email: 'newuser@example.com',
      };

      service.getUsersCount.mockResolvedValue(5);
      service.create.mockResolvedValue(newUser);

      const result = await controller.create(createDto);

      expect(result).toEqual(newUser);
      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, false);
    });

    it('should create first user as admin', async () => {
      const createDto: CreateUserDto = {
        email: 'firstuser@example.com',
        password: 'SecurePassword123!',
      };

      const firstUser = {
        ...mockAdminUserResponse,
        email: 'firstuser@example.com',
      };

      service.getUsersCount.mockResolvedValue(0);
      service.create.mockResolvedValue(firstUser);

      const result = await controller.create(createDto);

      expect(result).toEqual(firstUser);
      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, true);
    });

    it('should create user with explicitly specified role', async () => {
      const createDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'SecurePassword123!',
        role: UserRole.ADMIN,
      };

      service.getUsersCount.mockResolvedValue(1);
      service.create.mockResolvedValue(mockAdminUserResponse);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockAdminUserResponse);
      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, false);
    });

    it('should create user without role (uses default)', async () => {
      const createDto: CreateUserDto = {
        email: 'defaultuser@example.com',
        password: 'SecurePassword123!',
      };

      const newUser = {
        ...mockUserResponse,
        email: 'defaultuser@example.com',
        role: UserRole.USER,
      };

      service.getUsersCount.mockResolvedValue(3);
      service.create.mockResolvedValue(newUser);

      const result = await controller.create(createDto);

      expect(result).toEqual(newUser);
      expect(result.role).toBe(UserRole.USER);
      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, false);
    });

    it('should handle creating user with long password', async () => {
      const createDto: CreateUserDto = {
        email: 'longpass@example.com',
        password: 'AVeryLongAndSecurePasswordThatMeetsAllRequirements123!@#',
      };

      const newUser = {
        ...mockUserResponse,
        email: 'longpass@example.com',
      };

      service.getUsersCount.mockResolvedValue(2);
      service.create.mockResolvedValue(newUser);

      const result = await controller.create(createDto);

      expect(result).toEqual(newUser);
      expect(service.create).toHaveBeenCalledWith(createDto, false);
    });
  });

  describe('update', () => {
    it('should update user email', async () => {
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
      };

      const updatedUser = {
        ...mockUserResponse,
        email: 'updated@example.com',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('test-user-uuid', updateDto);

      expect(result).toEqual(updatedUser);
      expect(result.email).toBe('updated@example.com');
      expect(service.update).toHaveBeenCalledWith('test-user-uuid', updateDto);
    });

    it('should update user password', async () => {
      const updateDto: UpdateUserDto = {
        password: 'NewSecurePassword456!',
      };

      const updatedUser = {
        ...mockUserResponse,
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('test-user-uuid', updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('test-user-uuid', updateDto);
    });

    it('should update user role', async () => {
      const updateDto: UpdateUserDto = {
        role: UserRole.ADMIN,
      };

      const updatedUser = {
        ...mockUserResponse,
        role: UserRole.ADMIN,
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('test-user-uuid', updateDto);

      expect(result).toEqual(updatedUser);
      expect(result.role).toBe(UserRole.ADMIN);
      expect(service.update).toHaveBeenCalledWith('test-user-uuid', updateDto);
    });

    it('should update multiple user fields', async () => {
      const updateDto: UpdateUserDto = {
        email: 'newemail@example.com',
        password: 'NewPassword789!',
        role: UserRole.ADMIN,
      };

      const updatedUser = {
        ...mockUserResponse,
        email: 'newemail@example.com',
        role: UserRole.ADMIN,
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('test-user-uuid', updateDto);

      expect(result).toEqual(updatedUser);
      expect(result.email).toBe('newemail@example.com');
      expect(result.role).toBe(UserRole.ADMIN);
      expect(service.update).toHaveBeenCalledWith('test-user-uuid', updateDto);
    });

    it('should update user with empty dto (no changes)', async () => {
      const updateDto: UpdateUserDto = {};

      service.update.mockResolvedValue(mockUserResponse);

      const result = await controller.update('test-user-uuid', updateDto);

      expect(result).toEqual(mockUserResponse);
      expect(service.update).toHaveBeenCalledWith('test-user-uuid', updateDto);
    });

    it('should downgrade admin to user role', async () => {
      const updateDto: UpdateUserDto = {
        role: UserRole.USER,
      };

      const updatedUser = {
        ...mockAdminUserResponse,
        role: UserRole.USER,
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('admin-user-uuid', updateDto);

      expect(result).toEqual(updatedUser);
      expect(result.role).toBe(UserRole.USER);
      expect(service.update).toHaveBeenCalledWith('admin-user-uuid', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete user without request context', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('test-user-uuid');

      expect(service.remove).toHaveBeenCalledWith('test-user-uuid', undefined);
    });

    it('should delete user with request context but no user', async () => {
      const mockReq = {} as Request & { user?: { id?: string } };
      service.remove.mockResolvedValue(undefined);

      await controller.remove('test-user-uuid', mockReq);

      expect(service.remove).toHaveBeenCalledWith('test-user-uuid', undefined);
    });

    it('should delete user with authenticated user context', async () => {
      const mockReq = {
        user: { id: 'admin-user-uuid' },
      } as Request & { user?: { id?: string } };
      service.remove.mockResolvedValue(undefined);

      await controller.remove('test-user-uuid', mockReq);

      expect(service.remove).toHaveBeenCalledWith('test-user-uuid', 'admin-user-uuid');
    });

    it('should prevent user from deleting themselves', async () => {
      const mockReq = {
        user: { id: 'test-user-uuid' },
      } as Request & { user?: { id?: string } };
      service.remove.mockResolvedValue(undefined);

      await controller.remove('test-user-uuid', mockReq);

      expect(service.remove).toHaveBeenCalledWith('test-user-uuid', 'test-user-uuid');
    });

    it('should handle deletion by another admin user', async () => {
      const mockReq = {
        user: { id: 'admin-user-uuid' },
      } as Request & { user?: { id?: string } };
      service.remove.mockResolvedValue(undefined);

      await controller.remove('other-user-uuid', mockReq);

      expect(service.remove).toHaveBeenCalledWith('other-user-uuid', 'admin-user-uuid');
    });

    it('should handle request with user object but no id', async () => {
      const mockReq = {
        user: {},
      } as Request & { user?: { id?: string } };
      service.remove.mockResolvedValue(undefined);

      await controller.remove('test-user-uuid', mockReq);

      expect(service.remove).toHaveBeenCalledWith('test-user-uuid', undefined);
    });

    it('should return undefined on successful deletion', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('test-user-uuid');

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('test-user-uuid', undefined);
    });
  });

  describe('edge cases', () => {
    it('should handle UUID v4 format for findOne', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      service.findOne.mockResolvedValue(mockUserResponse);

      const result = await controller.findOne(validUUID);

      expect(result).toEqual(mockUserResponse);
      expect(service.findOne).toHaveBeenCalledWith(validUUID);
    });

    it('should handle UUID v4 format for update', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
      };
      service.update.mockResolvedValue(mockUserResponse);

      const result = await controller.update(validUUID, updateDto);

      expect(result).toEqual(mockUserResponse);
      expect(service.update).toHaveBeenCalledWith(validUUID, updateDto);
    });

    it('should handle UUID v4 format for remove', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      service.remove.mockResolvedValue(undefined);

      await controller.remove(validUUID);

      expect(service.remove).toHaveBeenCalledWith(validUUID, undefined);
    });

    it('should handle zero limit with default fallback', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(undefined);

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('should handle zero offset', async () => {
      const users = [mockUserResponse, mockAdminUserResponse];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll(10, 0);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(10, 0);
    });
  });

  describe('first user scenario', () => {
    it('should correctly identify first user when count is 0', async () => {
      const createDto: CreateUserDto = {
        email: 'first@example.com',
        password: 'FirstPassword123!',
      };

      service.getUsersCount.mockResolvedValue(0);
      service.create.mockResolvedValue(mockAdminUserResponse);

      await controller.create(createDto);

      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, true);
    });

    it('should correctly identify non-first user when count is 1', async () => {
      const createDto: CreateUserDto = {
        email: 'second@example.com',
        password: 'SecondPassword123!',
      };

      service.getUsersCount.mockResolvedValue(1);
      service.create.mockResolvedValue(mockUserResponse);

      await controller.create(createDto);

      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, false);
    });

    it('should correctly identify non-first user when count is greater than 1', async () => {
      const createDto: CreateUserDto = {
        email: 'nth@example.com',
        password: 'NthPassword123!',
      };

      service.getUsersCount.mockResolvedValue(100);
      service.create.mockResolvedValue(mockUserResponse);

      await controller.create(createDto);

      expect(service.getUsersCount).toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledWith(createDto, false);
    });
  });
});
