import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CustomerProfilesService } from './customer-profiles.service';
import { InvoiceRefsRepository } from '../repositories/invoice-refs.repository';

@Injectable()
export class InvoiceNinjaService {
  private readonly client: AxiosInstance;

  constructor(
    private readonly invoiceRefsRepository: InvoiceRefsRepository,
    private readonly customerProfilesService: CustomerProfilesService,
  ) {
    const baseURL = process.env.INVOICE_NINJA_BASE_URL || '';
    this.client = axios.create({
      baseURL,
      headers: {
        'X-API-Token': process.env.INVOICE_NINJA_API_TOKEN || '',
        'Content-Type': 'application/json',
      },
    });
  }

  async listInvoices(subscriptionId: string) {
    return await this.invoiceRefsRepository.findBySubscription(subscriptionId);
  }

  async createInvoiceRef(subscriptionId: string, invoiceNinjaId: string, preAuthUrl: string, status?: string) {
    return await this.invoiceRefsRepository.create({
      subscriptionId,
      invoiceNinjaId,
      preAuthUrl,
      status,
    });
  }

  async fetchInvoiceDetails(invoiceId: string) {
    const response = await this.client.get(`/api/v1/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoiceForSubscription(subscriptionId: string, userId: string, amount: number, description?: string) {
    const clientId = await this.syncCustomerProfile(userId);
    if (!clientId) {
      throw new Error('InvoiceNinja client not available');
    }

    const payload = {
      client_id: clientId,
      line_items: [
        {
          product_key: 'subscription',
          notes: description || 'Subscription charge',
          cost: amount,
          quantity: 1,
        },
      ],
    };

    const response = await this.client.post('/api/v1/invoices', payload);
    const invoiceId = response.data?.data?.id as string | undefined;
    const preAuthUrl = response.data?.data?.url as string | undefined;
    if (!invoiceId || !preAuthUrl) {
      throw new Error('Failed to create invoice');
    }

    await this.createInvoiceRef(subscriptionId, invoiceId, preAuthUrl, response.data?.data?.status_id?.toString());
    return { invoiceId, preAuthUrl };
  }

  async syncCustomerProfile(userId: string) {
    const profile = await this.customerProfilesService.getByUserId(userId);
    if (!profile) {
      return null;
    }

    const displayName = profile.company || `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
    const payload = {
      name: displayName || profile.email || `Customer ${userId}`,
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      address1: profile.addressLine1,
      address2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      postal_code: profile.postalCode,
      country: profile.country,
    };

    if (profile.invoiceNinjaClientId) {
      await this.client.put(`/api/v1/clients/${profile.invoiceNinjaClientId}`, payload);
      return profile.invoiceNinjaClientId;
    }

    const response = await this.client.post('/api/v1/clients', payload);
    const clientId = response.data?.data?.id as string | undefined;
    if (clientId) {
      await this.customerProfilesService.updateInvoiceNinjaClientId(userId, clientId);
      return clientId;
    }
    return null;
  }
}
