export class InvoiceResponseDto {
  id!: string;
  subscriptionId!: string;
  invoiceNinjaId!: string;
  preAuthUrl!: string;
  status?: string;
  createdAt!: Date;
}
