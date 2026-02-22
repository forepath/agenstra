import { CustomerProfilesService } from './customer-profiles.service';

describe('CustomerProfilesService', () => {
  it('creates profile when missing', async () => {
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'p1' }),
      update: jest.fn(),
    } as any;
    const service = new CustomerProfilesService(repository);
    const result = await service.upsert('user-1', { firstName: 'Jane' });
    expect(result.id).toBe('p1');
  });
});
