import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  it('routes to Hetzner provisioning', async () => {
    const hetzner = { provisionServer: jest.fn().mockResolvedValue({ serverId: '1' }) } as any;
    const service = new ProvisioningService(hetzner);
    const result = await service.provision('hetzner', { name: 'test' });
    expect(result).toEqual({ serverId: '1' });
  });
});
