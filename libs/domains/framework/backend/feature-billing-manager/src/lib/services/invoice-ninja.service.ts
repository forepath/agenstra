import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { getInvoiceNinjaCountryId } from '../maps/invoice-ninja-country-id.map';
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
    const countryId = getInvoiceNinjaCountryId(profile.country);
    const payload: Record<string, unknown> = {
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
    };
    if (countryId != null) {
      payload.country_id = countryId;
    }

    if (profile.invoiceNinjaClientId) {
      try {
        await this.client.put(`/api/v1/clients/${profile.invoiceNinjaClientId}`, payload);
        return profile.invoiceNinjaClientId;
      } catch (error) {
        const axiosError = error as AxiosError;
        const response = axiosError.response;
        if (!response) {
          throw error;
        }

        const status = response.status;
        const data = response.data as unknown;
        const message =
          typeof data === 'string'
            ? data
            : typeof (data as { message?: unknown })?.message === 'string'
              ? ((data as { message?: string }).message as string)
              : '';

        const isMissingRemoteClient =
          status === 404 ||
          (status === 400 && typeof message === 'string' && message.includes('No query results for model'));

        if (!isMissingRemoteClient) {
          throw error;
        }
        // If the remote client no longer exists, fall through to create a new one
      }
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
