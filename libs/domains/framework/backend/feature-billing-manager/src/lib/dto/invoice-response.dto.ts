export class InvoiceResponseDto {
  id!: string;
  subscriptionId!: string;
  invoiceNinjaId!: string;
  invoiceNumber?: string;
  preAuthUrl!: string;
  status?: string;
  createdAt!: Date;
}
