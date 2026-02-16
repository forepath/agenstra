import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';
import { CustomerProfilesRepository } from '../repositories/customer-profiles.repository';

@Injectable()
export class CustomerProfilesService {
  constructor(private readonly customerProfilesRepository: CustomerProfilesRepository) {}

  async getByUserId(userId: string): Promise<CustomerProfileEntity | null> {
    return await this.customerProfilesRepository.findByUserId(userId);
  }

  async upsert(userId: string, dto: Partial<CustomerProfileEntity>): Promise<CustomerProfileEntity> {
    const existing = await this.customerProfilesRepository.findByUserId(userId);
    if (existing) {
      return await this.customerProfilesRepository.update(existing.id, dto);
    }

    return await this.customerProfilesRepository.create({
      userId,
      ...dto,
    });
  }

  async updateInvoiceNinjaClientId(userId: string, invoiceNinjaClientId: string): Promise<CustomerProfileEntity> {
    const profile = await this.customerProfilesRepository.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Customer profile not found');
    }

    return await this.customerProfilesRepository.update(profile.id, { invoiceNinjaClientId });
  }
}
