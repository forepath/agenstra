export class InvoiceResponseDto {
  id!: string;
  subscriptionId!: string;
  invoiceNinjaId!: string;
  invoiceNumber?: string;
  preAuthUrl!: string;
  status?: string;
  balance?: number;
  /** Subscription number (e.g. SUB-000001) when listing across subscriptions. */
  subscriptionNumber?: string;
  createdAt!: Date;
  /** Invoice due date (from provider). */
  dueDate?: Date;
}
