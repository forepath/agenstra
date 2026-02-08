import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddClientUserDto } from '../dto/add-client-user.dto';
import { ClientUserEntity, ClientUserRole } from '../entities/client-user.entity';
import { StatisticsEntityType } from '../entities/statistics-entity-event.entity';
import { UserRole } from '../entities/user.entity';
import { ClientUsersRepository } from '../repositories/client-users.repository';
import { UsersRepository } from '../repositories/users.repository';
import { ClientUsersService } from './client-users.service';
import { StatisticsService } from './statistics.service';

describe('ClientUsersService', () => {
  let service: ClientUsersService;
  let clientUsersRepository: jest.Mocked<ClientUsersRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let statisticsService: jest.Mocked<StatisticsService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'user@example.com',
    passwordHash: 'hash',
    role: UserRole.USER,
  };

  const mockClientUser: ClientUserEntity = {
    id: 'cu-uuid',
    userId: 'user-uuid',
    clientId: 'client-uuid',
    role: ClientUserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClientUserRepository = {
    create: jest.fn(),
    findByUserAndClient: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findByClientId: jest.fn(),
    delete: jest.fn(),
  };

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockStatisticsService = {
    recordEntityCreated: jest.fn().mockResolvedValue(undefined),
    recordEntityDeleted: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientUsersService,
        { provide: ClientUsersRepository, useValue: mockClientUserRepository },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: StatisticsService, useValue: mockStatisticsService },
      ],
    }).compile();

    service = module.get(ClientUsersService);
    clientUsersRepository = module.get(ClientUsersRepository);
    usersRepository = module.get(UsersRepository);
    statisticsService = module.get(StatisticsService);

    jest.clearAllMocks();
    mockClientUserRepository.create.mockResolvedValue(mockClientUser);
    mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addUserToClient', () => {
    it('should add user to client and record statistics', async () => {
      mockClientUserRepository.findByUserAndClient.mockResolvedValue(null);

      const dto: AddClientUserDto = { email: 'user@example.com', role: ClientUserRole.USER };
      const result = await service.addUserToClient('client-uuid', dto, 'admin-uuid', UserRole.ADMIN, false);

      expect(result).toMatchObject({ id: 'cu-uuid', userId: 'user-uuid', clientId: 'client-uuid' });
      expect(statisticsService.recordEntityCreated).toHaveBeenCalledWith(
        StatisticsEntityType.CLIENT_USER,
        'cu-uuid',
        expect.objectContaining({
          clientId: 'client-uuid',
          userId: 'user-uuid',
          role: ClientUserRole.USER,
        }),
        'admin-uuid',
      );
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const dto: AddClientUserDto = { email: 'unknown@example.com', role: ClientUserRole.USER };
      await expect(service.addUserToClient('client-uuid', dto, 'admin-uuid', UserRole.ADMIN, false)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addUserToClient('client-uuid', dto, 'admin-uuid', UserRole.ADMIN, false)).rejects.toThrow(
        "User with email 'unknown@example.com' not found",
      );

      expect(statisticsService.recordEntityCreated).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user already associated', async () => {
      mockClientUserRepository.findByUserAndClient.mockResolvedValue(mockClientUser);

      const dto: AddClientUserDto = { email: 'user@example.com', role: ClientUserRole.USER };
      await expect(service.addUserToClient('client-uuid', dto, 'admin-uuid', UserRole.ADMIN, false)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addUserToClient('client-uuid', dto, 'admin-uuid', UserRole.ADMIN, false)).rejects.toThrow(
        "User 'user@example.com' is already associated with this client",
      );

      expect(statisticsService.recordEntityCreated).not.toHaveBeenCalled();
    });

    it('should allow client admin to add user role only', async () => {
      mockClientUserRepository.findByUserAndClient.mockResolvedValue(null);

      const dto: AddClientUserDto = { email: 'user@example.com', role: ClientUserRole.USER };
      await service.addUserToClient(
        'client-uuid',
        dto,
        'client-admin-uuid',
        UserRole.USER,
        false,
        ClientUserRole.ADMIN,
      );

      expect(statisticsService.recordEntityCreated).toHaveBeenCalled();
    });

    it('should throw when client admin tries to add admin role', async () => {
      mockClientUserRepository.findByUserAndClient.mockResolvedValue(null);

      const dto: AddClientUserDto = { email: 'user@example.com', role: ClientUserRole.ADMIN as ClientUserRole };
      await expect(
        service.addUserToClient('client-uuid', dto, 'client-admin-uuid', UserRole.USER, false, ClientUserRole.ADMIN),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addUserToClient('client-uuid', dto, 'client-admin-uuid', UserRole.USER, false, ClientUserRole.ADMIN),
      ).rejects.toThrow('Client admins can only add users with "user" role');
    });
  });

  describe('removeUserFromClient', () => {
    it('should remove user from client and record statistics', async () => {
      mockClientUserRepository.findByIdOrThrow.mockResolvedValue({
        ...mockClientUser,
        clientId: 'client-uuid',
      });
      mockClientUserRepository.delete.mockResolvedValue(undefined);

      await service.removeUserFromClient('client-uuid', 'cu-uuid', 'admin-uuid', UserRole.ADMIN, false);

      expect(clientUsersRepository.delete).toHaveBeenCalledWith('cu-uuid');
      expect(statisticsService.recordEntityDeleted).toHaveBeenCalledWith(
        StatisticsEntityType.CLIENT_USER,
        'cu-uuid',
        'admin-uuid',
      );
    });

    it('should throw when relationship does not belong to client', async () => {
      mockClientUserRepository.findByIdOrThrow.mockResolvedValue({
        ...mockClientUser,
        clientId: 'other-client-uuid',
      });

      await expect(
        service.removeUserFromClient('client-uuid', 'cu-uuid', 'admin-uuid', UserRole.ADMIN, false),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.removeUserFromClient('client-uuid', 'cu-uuid', 'admin-uuid', UserRole.ADMIN, false),
      ).rejects.toThrow('Relationship does not belong to the specified client');

      expect(statisticsService.recordEntityDeleted).not.toHaveBeenCalled();
    });
  });

  describe('getClientUsers', () => {
    it('should return client users with emails', async () => {
      mockClientUserRepository.findByClientId.mockResolvedValue([{ ...mockClientUser, user: mockUser }]);

      const result = await service.getClientUsers('client-uuid');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'cu-uuid', userEmail: 'user@example.com' });
    });
  });
});
