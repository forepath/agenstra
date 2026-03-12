import { Injectable } from '@nestjs/common';
import { ServerInfo } from '../utils/provisioning.utils';
import { HetznerProvisioningService } from './hetzner-provisioning.service';

@Injectable()
export class ProvisioningService {
  constructor(private readonly hetznerProvisioningService: HetznerProvisioningService) {}

  async provision(provider: string, config: { [key: string]: unknown }) {
    if (provider === 'hetzner') {
      return await this.hetznerProvisioningService.provisionServer(config as never);
    }

    return null;
  }

  async deprovision(provider: string, serverId: string): Promise<void> {
    if (provider === 'hetzner') {
      await this.hetznerProvisioningService.deprovisionServer(serverId);
    }
  }

  async getServerInfo(provider: string, serverId: string): Promise<ServerInfo | null> {
    if (provider === 'hetzner') {
      return await this.hetznerProvisioningService.getServerInfo(serverId);
    }

    return null;
  }

  async startServer(provider: string, serverId: string): Promise<void> {
    if (provider === 'hetzner') {
      await this.hetznerProvisioningService.startServer(serverId);
    }
  }

  async stopServer(provider: string, serverId: string): Promise<void> {
    if (provider === 'hetzner') {
      await this.hetznerProvisioningService.stopServer(serverId);
    }
  }

  async restartServer(provider: string, serverId: string): Promise<void> {
    if (provider === 'hetzner') {
      await this.hetznerProvisioningService.restartServer(serverId);
    }
  }
}
