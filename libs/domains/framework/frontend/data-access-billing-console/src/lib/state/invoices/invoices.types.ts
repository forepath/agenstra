export interface InvoiceResponseDto {
  id: string;
  subscriptionId: string;
  invoiceNinjaInvoiceId?: string;
  invoiceNumber?: string;
  amount?: string;
  currency?: string;
  status?: string;
  invoiceUrl?: string;
  preAuthUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceDto {
  description?: string;
}
