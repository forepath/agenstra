import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { InvoiceRefEntity } from '../entities/invoice-ref.entity';
import { InvoiceCreationService } from '../services/invoice-creation.service';
import { InvoiceNinjaService } from '../services/invoice-ninja.service';
import { getUserFromRequest, type RequestWithUser } from '../utils/billing-access.utils';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoiceNinjaService: InvoiceNinjaService,
    private readonly invoiceCreationService: InvoiceCreationService,
  ) {}

  @Get(':subscriptionId')
  async list(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Req() req?: RequestWithUser,
  ): Promise<InvoiceResponseDto[]> {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }
    await this.invoiceNinjaService.syncCustomerProfile(userInfo.userId);
    const rows = await this.invoiceNinjaService.listInvoices(subscriptionId);
    return rows.map((row) => this.mapToResponse(row));
  }

  @Post(':subscriptionId')
  async create(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Body() dto: CreateInvoiceDto,
    @Req() req?: RequestWithUser,
  ) {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return await this.invoiceCreationService.createInvoice(subscriptionId, userInfo.userId, dto.description);
  }

  private mapToResponse(row: InvoiceRefEntity): InvoiceResponseDto {
    return {
      id: row.id,
      subscriptionId: row.subscriptionId,
      invoiceNinjaId: row.invoiceNinjaId,
      preAuthUrl: row.preAuthUrl,
      status: row.status,
      createdAt: row.createdAt,
    };
  }
}
