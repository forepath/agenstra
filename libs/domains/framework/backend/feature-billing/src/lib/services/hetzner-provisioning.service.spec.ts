import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { HetznerProvisioningService } from './hetzner-provisioning.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HetznerProvisioningService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, HETZNER_API_TOKEN: 'test-token' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('provisions a server', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { server: { id: 12345 } },
    });

    const service = new HetznerProvisioningService();
    const result = await service.provisionServer({
      name: 'test-server',
      serverType: 'cx11',
      location: 'fsn1',
      userData: '#!/bin/bash\necho hello',
    });

    expect(result).toEqual({ serverId: '12345' });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.hetzner.cloud/v1/servers',
      expect.objectContaining({
        name: 'test-server',
        server_type: 'cx11',
        location: 'fsn1',
      }),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
  });

  it('provisions server with firewall', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { server: { id: 12345 } } }).mockResolvedValueOnce({});

    const service = new HetznerProvisioningService();
    const result = await service.provisionServer({
      name: 'test-server',
      serverType: 'cx11',
      location: 'fsn1',
      firewallId: 42,
      userData: '#!/bin/bash\necho hello',
    });

    expect(result).toEqual({ serverId: '12345' });
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      'https://api.hetzner.cloud/v1/firewalls/42/actions/attach_to_server',
      { server: 12345 },
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
  });

  it('throws when no server id returned', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    const service = new HetznerProvisioningService();
    await expect(
      service.provisionServer({
        name: 'test-server',
        serverType: 'cx11',
        location: 'fsn1',
        userData: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when API token not set', async () => {
    delete process.env.HETZNER_API_TOKEN;

    const service = new HetznerProvisioningService();
    await expect(
      service.provisionServer({
        name: 'test-server',
        serverType: 'cx11',
        location: 'fsn1',
        userData: '',
      }),
    ).rejects.toThrow('HETZNER_API_TOKEN environment variable is not set');
  });

  it('deprovisions a server', async () => {
    mockedAxios.delete.mockResolvedValueOnce({});

    const service = new HetznerProvisioningService();
    await service.deprovisionServer('12345');

    expect(mockedAxios.delete).toHaveBeenCalledWith('https://api.hetzner.cloud/v1/servers/12345', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('skips deprovisioning when API token not set', async () => {
    delete process.env.HETZNER_API_TOKEN;

    const service = new HetznerProvisioningService();
    await service.deprovisionServer('12345');

    expect(mockedAxios.delete).not.toHaveBeenCalled();
  });

  it('throws on deprovision error', async () => {
    mockedAxios.delete.mockRejectedValueOnce({ message: 'Not found' });

    const service = new HetznerProvisioningService();
    await expect(service.deprovisionServer('12345')).rejects.toThrow(BadRequestException);
  });
});
