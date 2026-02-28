import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { getInvoiceNinjaCountryId } from '../maps/invoice-ninja-country-id.map';
import { InvoiceRefsRepository } from '../repositories/invoice-refs.repository';
import { CustomerProfilesService } from './customer-profiles.service';

interface InvoiceNinjaInvoiceResponse {
  id?: string;
  url?: string;
  status_id?: string | number;
  number?: string | number;
  balance?: number | string;
  invitations?: Array<{ key?: string; link?: string }>;
}

@Injectable()
export class InvoiceNinjaService {
  private readonly logger = new Logger(InvoiceNinjaService.name);
  private readonly client: AxiosInstance;
  private readonly baseURL: string;

  constructor(
    private readonly invoiceRefsRepository: InvoiceRefsRepository,
    private readonly customerProfilesService: CustomerProfilesService,
  ) {
    this.baseURL = process.env.INVOICE_NINJA_BASE_URL || '';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-API-Token': process.env.INVOICE_NINJA_API_TOKEN || '',
        'Content-Type': 'application/json',
      },
    });
  }

  async listInvoices(userId: string, subscriptionId: string) {
    return await this.invoiceRefsRepository.findBySubscription(userId, subscriptionId);
  }

  async createInvoiceRef(
    subscriptionId: string,
    invoiceNinjaId: string,
    preAuthUrl: string,
    status?: string,
    invoiceNumber?: string,
  ) {
    return await this.invoiceRefsRepository.create({
      subscriptionId,
      invoiceNinjaId,
      preAuthUrl,
      status,
      invoiceNumber,
    });
  }

  async fetchInvoiceDetails(invoiceId: string) {
    const response = await this.client.get(`/api/v1/invoices/${invoiceId}`);
    return response.data;
  }

  /**
   * Fetches a fresh client/invite URL for an invoice from Invoice Ninja (e.g. for "Open" when the previous link expired).
   * Returns null when the invoice is not found or the API request fails.
   */
  async getInvoiceClientLink(invoiceNinjaId: string): Promise<string | null> {
    const details = await this.getInvoiceDetailsForSync(invoiceNinjaId);
    return details?.preAuthUrl ?? null;
  }

  /**
   * Fetches invoice status, number, balance, and client/invite URL from Invoice Ninja for syncing to local refs.
   * Returns null when the invoice is not found or the API request fails.
   */
  async getInvoiceDetailsForSync(invoiceId: string): Promise<{
    status?: string;
    invoiceNumber?: string;
    preAuthUrl?: string;
    balance?: number;
  } | null> {
    let raw: unknown;
    try {
      const response = await this.client.get(`/api/v1/invoices/${invoiceId}`);
      raw = response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 404) {
        return null;
      }
      this.logger.warn(`Invoice Ninja get invoice failed for ${invoiceId}: ${(error as Error).message}`);
      return null;
    }

    const data: InvoiceNinjaInvoiceResponse | undefined =
      raw && typeof raw === 'object' && 'data' in raw
        ? (raw as { data?: InvoiceNinjaInvoiceResponse }).data
        : (raw as InvoiceNinjaInvoiceResponse);

    const status = data?.status_id != null ? String(data.status_id) : undefined;
    const invoiceNumber = data?.number != null ? String(data.number) : undefined;
    const preAuthUrl = this.resolveInvoiceClientUrl(data);
    const balance =
      data?.balance !== undefined && data?.balance !== null
        ? typeof data.balance === 'number'
          ? data.balance
          : parseFloat(String(data.balance))
        : undefined;
    if (balance !== undefined && Number.isNaN(balance)) {
      this.logger.warn(`Invoice Ninja invoice ${invoiceId} returned invalid balance: ${data?.balance}`);
    }
    const balanceNum = balance !== undefined && !Number.isNaN(balance) ? balance : undefined;

    return { status, invoiceNumber, preAuthUrl, balance: balanceNum };
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

    let rawResponse: unknown;
    try {
      const response = await this.client.post<{ data?: InvoiceNinjaInvoiceResponse } | InvoiceNinjaInvoiceResponse>(
        '/api/v1/invoices',
        payload,
        {
          params: {
            send_email: 'true',
          },
        },
      );
      rawResponse = response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const status = axiosError.response?.status;
      const body = axiosError.response?.data;
      const message =
        typeof body?.message === 'string'
          ? body.message
          : body?.errors
            ? JSON.stringify(body.errors)
            : axiosError.message;
      this.logger.warn(
        `Invoice Ninja create invoice failed: status=${status} message=${message}${body ? ` body=${JSON.stringify(body)}` : ''}`,
      );
      throw new Error(`Invoice Ninja API error: ${message}`);
    }

    const data: InvoiceNinjaInvoiceResponse | undefined =
      rawResponse && typeof rawResponse === 'object' && 'data' in rawResponse
        ? (rawResponse as { data?: InvoiceNinjaInvoiceResponse }).data
        : (rawResponse as InvoiceNinjaInvoiceResponse);

    const invoiceId = data?.id;
    const preAuthUrl = this.resolveInvoiceClientUrl(data);
    if (!invoiceId || !preAuthUrl) {
      this.logger.warn(
        `Invoice Ninja create response missing id or client URL (hasId=${Boolean(invoiceId)} hasInvitations=${Boolean(data?.invitations?.length)})`,
      );
      throw new Error('Failed to create invoice: invalid response from Invoice Ninja');
    }

    const statusId = data?.status_id != null ? String(data.status_id) : undefined;
    const invoiceNumber = data?.number != null ? String(data.number) : undefined;
    const ref = await this.createInvoiceRef(subscriptionId, invoiceId, preAuthUrl, statusId, invoiceNumber);
    return { invoiceId, preAuthUrl, invoiceRefId: ref.id };
  }

  /**
   * Creates one invoice with multiple line items (e.g. accumulated open positions for a user).
   * Uses primarySubscriptionId for the stored invoice ref.
   */
  async createInvoiceWithLineItems(
    userId: string,
    lineItems: { description: string; amount: number }[],
    primarySubscriptionId: string,
  ): Promise<{ invoiceId: string; preAuthUrl: string; invoiceRefId: string }> {
    const clientId = await this.syncCustomerProfile(userId);
    if (!clientId) {
      throw new Error('InvoiceNinja client not available');
    }

    const payload = {
      client_id: clientId,
      line_items: lineItems.map((item) => ({
        product_key: 'subscription',
        notes: item.description || 'Subscription charge',
        cost: item.amount,
        quantity: 1,
      })),
    };

    let rawResponse: unknown;
    try {
      const response = await this.client.post<{ data?: InvoiceNinjaInvoiceResponse } | InvoiceNinjaInvoiceResponse>(
        '/api/v1/invoices',
        payload,
        {
          params: {
            send_email: 'true',
          },
        },
      );
      rawResponse = response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const status = axiosError.response?.status;
      const body = axiosError.response?.data;
      const message =
        typeof body?.message === 'string'
          ? body?.message
          : body?.errors
            ? JSON.stringify(body.errors)
            : axiosError.message;
      this.logger.warn(
        `Invoice Ninja create invoice failed: status=${status} message=${message}${body ? ` body=${JSON.stringify(body)}` : ''}`,
      );
      throw new Error(`Invoice Ninja API error: ${message}`);
    }

    const data: InvoiceNinjaInvoiceResponse | undefined =
      rawResponse && typeof rawResponse === 'object' && 'data' in rawResponse
        ? (rawResponse as { data?: InvoiceNinjaInvoiceResponse }).data
        : (rawResponse as InvoiceNinjaInvoiceResponse);

    const invoiceId = data?.id;
    const preAuthUrl = this.resolveInvoiceClientUrl(data);
    if (!invoiceId || !preAuthUrl) {
      this.logger.warn(
        `Invoice Ninja create response missing id or client URL (hasId=${Boolean(invoiceId)} hasInvitations=${Boolean(data?.invitations?.length)})`,
      );
      throw new Error('Failed to create invoice: invalid response from Invoice Ninja');
    }

    const statusId = data?.status_id != null ? String(data.status_id) : undefined;
    const invoiceNumber = data?.number != null ? String(data.number) : undefined;
    const ref = await this.createInvoiceRef(primarySubscriptionId, invoiceId, preAuthUrl, statusId, invoiceNumber);
    return { invoiceId, preAuthUrl, invoiceRefId: ref.id };
  }

  private resolveInvoiceClientUrl(data: InvoiceNinjaInvoiceResponse | undefined): string | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }
    if (typeof data.url === 'string' && data.url.length > 0) {
      return data.url;
    }
    const firstInvitation = data.invitations?.[0];
    if (firstInvitation?.link && typeof firstInvitation.link === 'string' && firstInvitation.link.length > 0) {
      return firstInvitation.link;
    }
    if (firstInvitation?.key && typeof firstInvitation.key === 'string') {
      const base = this.baseURL.replace(/\/$/, '');
      return `${base}/client/invoice/${firstInvitation.key}`;
    }
    return undefined;
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
      contacts: [
        {
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          email: profile.email,
        },
      ],
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
