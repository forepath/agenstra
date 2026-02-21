import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  it('routes to Hetzner provisioning', async () => {
    const hetzner = { provisionServer: jest.fn().mockResolvedValue({ serverId: '1' }) } as any;
    const service = new ProvisioningService(hetzner);
    const result = await service.provision('hetzner', { name: 'test' });
    expect(result).toEqual({ serverId: '1' });
  });

  it('routes deprovision to Hetzner', async () => {
    const hetzner = {
      provisionServer: jest.fn(),
      deprovisionServer: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new ProvisioningService(hetzner);
    await service.deprovision('hetzner', 'server-123');
    expect(hetzner.deprovisionServer).toHaveBeenCalledWith('server-123');
  });

  it('ignores deprovision for unknown provider', async () => {
    const hetzner = {
      provisionServer: jest.fn(),
      deprovisionServer: jest.fn(),
    } as any;
    const service = new ProvisioningService(hetzner);
    await service.deprovision('unknown', 'server-123');
    expect(hetzner.deprovisionServer).not.toHaveBeenCalled();
  });

  it('returns null for unknown provider', async () => {
    const hetzner = { provisionServer: jest.fn() } as any;
    const service = new ProvisioningService(hetzner);
    const result = await service.provision('unknown', { name: 'test' });
    expect(result).toBeNull();
  });
});
