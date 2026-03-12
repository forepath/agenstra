import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  it('routes to Hetzner provisioning', async () => {
    const hetzner: { provisionServer: jest.Mock } = {
      provisionServer: jest.fn().mockResolvedValue({ serverId: '1' }),
    };
    const service = new ProvisioningService(hetzner as never);
    const result = await service.provision('hetzner', { name: 'test' });
    expect(result).toEqual({ serverId: '1' });
  });

  it('routes deprovision to Hetzner', async () => {
    const hetzner: { provisionServer: jest.Mock; deprovisionServer: jest.Mock } = {
      provisionServer: jest.fn(),
      deprovisionServer: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ProvisioningService(hetzner as never);
    await service.deprovision('hetzner', 'server-123');
    expect(hetzner.deprovisionServer).toHaveBeenCalledWith('server-123');
  });

  it('ignores deprovision for unknown provider', async () => {
    const hetzner: { provisionServer: jest.Mock; deprovisionServer: jest.Mock } = {
      provisionServer: jest.fn(),
      deprovisionServer: jest.fn(),
    };
    const service = new ProvisioningService(hetzner as never);
    await service.deprovision('unknown', 'server-123');
    expect(hetzner.deprovisionServer).not.toHaveBeenCalled();
  });

  it('returns null for unknown provider', async () => {
    const hetzner: { provisionServer: jest.Mock } = { provisionServer: jest.fn() };
    const service = new ProvisioningService(hetzner as never);
    const result = await service.provision('unknown', { name: 'test' });
    expect(result).toBeNull();
  });

  it('routes getServerInfo to Hetzner', async () => {
    const serverInfo = {
      serverId: '123',
      name: 'srv',
      publicIp: '1.2.3.4',
      status: 'running',
    };
    const hetzner: { getServerInfo: jest.Mock } = {
      getServerInfo: jest.fn().mockResolvedValue(serverInfo),
    };
    const service = new ProvisioningService(hetzner as never);
    const result = await service.getServerInfo('hetzner', '123');
    expect(result).toEqual(serverInfo);
    expect(hetzner.getServerInfo).toHaveBeenCalledWith('123');
  });

  it('returns null for getServerInfo with unknown provider', async () => {
    const hetzner: { getServerInfo: jest.Mock } = { getServerInfo: jest.fn() };
    const service = new ProvisioningService(hetzner as never);
    const result = await service.getServerInfo('unknown', '123');
    expect(result).toBeNull();
    expect(hetzner.getServerInfo).not.toHaveBeenCalled();
  });

  it('routes startServer to Hetzner', async () => {
    const hetzner: { startServer: jest.Mock } = {
      startServer: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ProvisioningService(hetzner as never);
    await service.startServer('hetzner', '123');
    expect(hetzner.startServer).toHaveBeenCalledWith('123');
  });

  it('does nothing for startServer with unknown provider', async () => {
    const hetzner: { startServer: jest.Mock } = { startServer: jest.fn() };
    const service = new ProvisioningService(hetzner as never);
    await service.startServer('unknown', '123');
    expect(hetzner.startServer).not.toHaveBeenCalled();
  });

  it('routes stopServer to Hetzner', async () => {
    const hetzner: { stopServer: jest.Mock } = {
      stopServer: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ProvisioningService(hetzner as never);
    await service.stopServer('hetzner', '123');
    expect(hetzner.stopServer).toHaveBeenCalledWith('123');
  });

  it('does nothing for stopServer with unknown provider', async () => {
    const hetzner: { stopServer: jest.Mock } = { stopServer: jest.fn() };
    const service = new ProvisioningService(hetzner as never);
    await service.stopServer('unknown', '123');
    expect(hetzner.stopServer).not.toHaveBeenCalled();
  });

  it('routes restartServer to Hetzner', async () => {
    const hetzner: { restartServer: jest.Mock } = {
      restartServer: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ProvisioningService(hetzner as never);
    await service.restartServer('hetzner', '123');
    expect(hetzner.restartServer).toHaveBeenCalledWith('123');
  });

  it('does nothing for restartServer with unknown provider', async () => {
    const hetzner: { restartServer: jest.Mock } = { restartServer: jest.fn() };
    const service = new ProvisioningService(hetzner as never);
    await service.restartServer('unknown', '123');
    expect(hetzner.restartServer).not.toHaveBeenCalled();
  });
});
