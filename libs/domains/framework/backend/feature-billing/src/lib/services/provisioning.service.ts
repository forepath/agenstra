import { Injectable } from '@nestjs/common';
import { HetznerProvisioningService } from './hetzner-provisioning.service';

@Injectable()
export class ProvisioningService {
  constructor(private readonly hetznerProvisioningService: HetznerProvisioningService) {}

  async provision(provider: string, config: { [key: string]: unknown }) {
    if (provider === 'hetzner') {
      return await this.hetznerProvisioningService.provisionServer(config as any);
    }

    return null;
  }

  async deprovision(provider: string, serverId: string): Promise<void> {
    if (provider === 'hetzner') {
      await this.hetznerProvisioningService.deprovisionServer(serverId);
    }
  }
}
