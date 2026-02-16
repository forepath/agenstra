import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

@Injectable()
export class HetznerProvisioningService {
  private readonly logger = new Logger(HetznerProvisioningService.name);
  private readonly apiToken: string;

  constructor() {
    this.apiToken = process.env.HETZNER_API_TOKEN || '';
    if (!this.apiToken) {
      this.logger.warn('HETZNER_API_TOKEN environment variable is not set. Hetzner provisioning will not function.');
    }
  }

  async provisionServer(config: {
    name: string;
    serverType: string;
    location: string;
    firewallId?: number;
    userData: string;
  }) {
    if (!this.apiToken) {
      throw new BadRequestException('HETZNER_API_TOKEN environment variable is not set');
    }

    try {
      const response = await axios.post(
        'https://api.hetzner.cloud/v1/servers',
        {
          name: config.name,
          server_type: config.serverType,
          image: 'ubuntu-22.04',
          location: config.location,
          user_data: config.userData,
        },
        {
          headers: { Authorization: `Bearer ${this.apiToken}` },
        },
      );

      const serverId = response.data?.server?.id as number | undefined;
      if (!serverId) {
        throw new BadRequestException('Failed to provision server');
      }

      if (config.firewallId) {
        await axios.post(
          `https://api.hetzner.cloud/v1/firewalls/${config.firewallId}/actions/attach_to_server`,
          { server: serverId },
          { headers: { Authorization: `Bearer ${this.apiToken}` } },
        );
      }

      return { serverId: serverId.toString() };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Failed to provision Hetzner server: ${axiosError.message}`);
      throw new BadRequestException(`Failed to provision server: ${axiosError.message}`);
    }
  }
}
