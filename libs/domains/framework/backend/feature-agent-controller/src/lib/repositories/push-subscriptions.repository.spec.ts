import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PushSubscriptionEntity } from '../entities/push-subscription.entity';
import { hashPushSubscriptionEndpoint } from '../utils/push-subscription-endpoint-hash';

import { PushSubscriptionsRepository } from './push-subscriptions.repository';

describe('PushSubscriptionsRepository', () => {
  let repository: PushSubscriptionsRepository;
  let typeOrmRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    typeOrmRepo = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity as PushSubscriptionEntity),
      save: jest.fn(async (entity) => entity as PushSubscriptionEntity),
      find: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushSubscriptionsRepository,
        { provide: getRepositoryToken(PushSubscriptionEntity), useValue: typeOrmRepo },
      ],
    }).compile();

    repository = module.get(PushSubscriptionsRepository);
  });

  it('upsert creates a new subscription with endpoint hash', async () => {
    typeOrmRepo.findOne.mockResolvedValue(null);

    const result = await repository.upsert({
      userId: 'user-1',
      endpoint: 'https://push.example/sub',
      p256dh: 'p',
      auth: 'a',
    });

    expect(typeOrmRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        endpointHash: hashPushSubscriptionEndpoint('https://push.example/sub'),
      }),
    );
    expect(result.endpoint).toBe('https://push.example/sub');
  });

  it('upsert updates an existing subscription', async () => {
    const existing = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'old',
      endpointHash: hashPushSubscriptionEndpoint('https://push.example/sub'),
      p256dh: 'old-p',
      auth: 'old-a',
    } as PushSubscriptionEntity;

    typeOrmRepo.findOne.mockResolvedValue(existing);

    const result = await repository.upsert({
      userId: 'user-1',
      endpoint: 'https://push.example/sub',
      p256dh: 'new-p',
      auth: 'new-a',
    });

    expect(result.p256dh).toBe('new-p');
    expect(typeOrmRepo.save).toHaveBeenCalledWith(existing);
  });

  it('deleteByUserAndEndpoint deletes by user and endpoint hash', async () => {
    await repository.deleteByUserAndEndpoint('user-1', 'https://push.example/sub');

    expect(typeOrmRepo.delete).toHaveBeenCalledWith({
      userId: 'user-1',
      endpointHash: hashPushSubscriptionEndpoint('https://push.example/sub'),
    });
  });

  it('findByUserIds returns empty array for no ids', async () => {
    await expect(repository.findByUserIds([])).resolves.toEqual([]);
    expect(typeOrmRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('findByUserIds queries subscriptions for user ids', async () => {
    const getMany = jest.fn().mockResolvedValue([]);

    typeOrmRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getMany,
    } as never);

    await repository.findByUserIds(['u1', 'u2']);

    expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('ps');
    expect(getMany).toHaveBeenCalled();
  });
});
