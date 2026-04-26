import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';

import { ProvisioningService } from './provisioning.service';
import { SshExecutorService } from './ssh-executor.service';
import { SubscriptionItemUpdateScheduler } from './subscription-item-update.scheduler';

describe('SubscriptionItemUpdateScheduler', () => {
  let scheduler: SubscriptionItemUpdateScheduler;
  let subscriptionItemsRepository: jest.Mocked<Pick<SubscriptionItemsRepository, 'findProvisionedWithSshKey'>>;
  let provisioningService: jest.Mocked<Pick<ProvisioningService, 'getServerInfo'>>;
  let sshExecutor: jest.Mocked<Pick<SshExecutorService, 'exec'>>;
  const mockItem = {
    id: 'item-1',
    subscriptionId: 'sub-1',
    providerReference: 'srv-123',
    sshPrivateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\n...',
    serviceType: { provider: 'hetzner' },
    configSnapshot: { service: 'controller' },
    subscription: { number: 'SUB-001', status: 'active' },
  };

  beforeEach(() => {
    subscriptionItemsRepository = {
      findProvisionedWithSshKey: jest.fn(),
    };
    provisioningService = {
      getServerInfo: jest.fn(),
    };
    sshExecutor = {
      exec: jest.fn(),
    };
    scheduler = new SubscriptionItemUpdateScheduler(
      subscriptionItemsRepository as never,
      provisioningService as never,
      sshExecutor as never,
    );
  });

  it('does nothing when no provisioned items with SSH key', async () => {
    subscriptionItemsRepository.findProvisionedWithSshKey.mockResolvedValue([]);

    await scheduler.runUpdateCycle();

    expect(provisioningService.getServerInfo).not.toHaveBeenCalled();
    expect(sshExecutor.exec).not.toHaveBeenCalled();
  });

  it('runs update command via SSH for each item with public IP', async () => {
    subscriptionItemsRepository.findProvisionedWithSshKey.mockResolvedValue([mockItem as never]);
    provisioningService.getServerInfo.mockResolvedValue({
      serverId: 'srv-123',
      name: 'test',
      publicIp: '1.2.3.4',
      status: 'running',
    } as never);
    sshExecutor.exec.mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    await scheduler.runUpdateCycle();

    expect(provisioningService.getServerInfo).toHaveBeenCalledWith('hetzner', 'srv-123');
    expect(sshExecutor.exec).toHaveBeenCalledWith(
      '1.2.3.4',
      22,
      'root',
      mockItem.sshPrivateKey,
      expect.stringContaining('docker compose up -d --pull=always'),
    );
    expect(sshExecutor.exec).toHaveBeenCalledWith(
      '1.2.3.4',
      22,
      'root',
      mockItem.sshPrivateKey,
      expect.stringContaining('/opt/agent-controller'),
    );
  });

  it('uses agent-manager update command when service is manager', async () => {
    const managerItem = { ...mockItem, configSnapshot: { service: 'manager' } };

    subscriptionItemsRepository.findProvisionedWithSshKey.mockResolvedValue([managerItem as never]);
    provisioningService.getServerInfo.mockResolvedValue({
      publicIp: '1.2.3.4',
    } as never);
    sshExecutor.exec.mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    await scheduler.runUpdateCycle();

    expect(sshExecutor.exec).toHaveBeenCalledWith(
      '1.2.3.4',
      22,
      'root',
      managerItem.sshPrivateKey,
      expect.stringContaining('/opt/agent-manager'),
    );
  });

  it('skips item when getServerInfo returns no public IP', async () => {
    subscriptionItemsRepository.findProvisionedWithSshKey.mockResolvedValue([mockItem as never]);
    provisioningService.getServerInfo.mockResolvedValue({
      serverId: 'srv-123',
      name: 'test',
      publicIp: '',
      status: 'running',
    } as never);

    await scheduler.runUpdateCycle();

    expect(sshExecutor.exec).not.toHaveBeenCalled();
  });

  it('skips item when getServerInfo returns null', async () => {
    subscriptionItemsRepository.findProvisionedWithSshKey.mockResolvedValue([mockItem as never]);
    provisioningService.getServerInfo.mockResolvedValue(null);

    await scheduler.runUpdateCycle();

    expect(sshExecutor.exec).not.toHaveBeenCalled();
  });

  it('continues to next item when one fails', async () => {
    const item2 = { ...mockItem, id: 'item-2', subscriptionId: 'sub-1', providerReference: 'srv-456' };

    subscriptionItemsRepository.findProvisionedWithSshKey.mockResolvedValue([mockItem as never, item2 as never]);
    provisioningService.getServerInfo
      .mockResolvedValueOnce({ publicIp: '1.2.3.4' } as never)
      .mockResolvedValueOnce({ publicIp: '5.6.7.8' } as never);
    sshExecutor.exec.mockRejectedValueOnce(new Error('SSH connection failed')).mockResolvedValueOnce({
      stdout: '',
      stderr: '',
      code: 0,
    });

    await scheduler.runUpdateCycle();

    expect(sshExecutor.exec).toHaveBeenCalledTimes(2);
  });
});
