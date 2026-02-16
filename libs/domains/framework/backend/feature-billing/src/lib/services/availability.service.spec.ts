import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  it('stores snapshot and returns response', async () => {
    const repository = { create: jest.fn().mockResolvedValue({}) } as any;
    const service = new AvailabilityService(repository);
    const result = await service.checkAvailability('other', 'region', 'type');
    expect(result.isAvailable).toBe(true);
    expect(repository.create).toHaveBeenCalled();
  });
});
