import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ServerTypeDto } from '../dto/server-type.dto';

const HETZNER_API_BASE = 'https://api.hetzner.cloud/v1';

interface HetznerServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  deprecated: boolean;
  prices: Array<{
    location: string;
    price_hourly?: { gross: number };
    price_monthly?: { gross: number };
  }>;
}

/**
 * Fetches server types with pricing from provisioning providers (e.g. Hetzner).
 * Used by the billing console to show server type dropdowns with price and to auto-set base price.
 */
@Injectable()
export class ProviderServerTypesService {
  async getServerTypes(providerId: string): Promise<ServerTypeDto[]> {
    if (providerId === 'hetzner') {
      return this.getHetznerServerTypes();
    }
    return [];
  }

  private async getHetznerServerTypes(): Promise<ServerTypeDto[]> {
    const apiToken = process.env.HETZNER_API_TOKEN;
    if (!apiToken) {
      throw new BadRequestException('HETZNER_API_TOKEN environment variable is not set');
    }

    try {
      const response = await axios.get<{ server_types: HetznerServerType[] }>(`${HETZNER_API_BASE}/server_types`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      const serverTypes = response.data.server_types ?? [];
      return serverTypes
        .filter((st) => !st.deprecated)
        .map((st) => {
          const priceFsn1 = st.prices.find((p) => p.location === 'fsn1');
          return {
            id: st.name,
            name: st.description || st.name,
            cores: st.cores,
            memory: st.memory,
            disk: st.disk,
            priceMonthly: priceFsn1?.price_monthly?.gross,
            priceHourly: priceFsn1?.price_hourly?.gross,
            description: st.description,
          };
        });
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new BadRequestException(`Failed to fetch server types: ${axiosError.message}`);
    }
  }
}
