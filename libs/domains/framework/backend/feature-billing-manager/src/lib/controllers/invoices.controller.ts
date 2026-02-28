import { KeycloakRoles, UserRole, UsersRoles } from '@forepath/identity/backend';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { InvoiceRefEntity } from '../entities/invoice-ref.entity';
import { InvoiceRefsRepository } from '../repositories/invoice-refs.repository';
import { UsersBillingDayRepository } from '../repositories/users-billing-day.repository';
import { InvoiceCreationService } from '../services/invoice-creation.service';
import { InvoiceNinjaService } from '../services/invoice-ninja.service';
import { SubscriptionService } from '../services/subscription.service';
import { getUserFromRequest, type RequestWithUser } from '../utils/billing-access.utils';

export class RefreshInvoiceLinkResponseDto {
  preAuthUrl!: string;
}

export class InvoicesSummaryResponseDto {
  openOverdueCount!: number;
  openOverdueTotal!: number;
  /** Day of month (1-28) when the user is billed for open positions. */
  billingDayOfMonth!: number;
  /** Total amount of unbilled open positions (to be invoiced on the next billing day). */
  unbilledTotal!: number;
}

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoiceNinjaService: InvoiceNinjaService,
    private readonly invoiceCreationService: InvoiceCreationService,
    private readonly invoiceRefsRepository: InvoiceRefsRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly usersBillingDayRepository: UsersBillingDayRepository,
  ) {}

  @Get('summary')
  async getSummary(@Req() req?: RequestWithUser): Promise<InvoicesSummaryResponseDto> {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }
    const [summary, billingDayOfMonth, unbilledTotal] = await Promise.all([
      this.invoiceRefsRepository.findOpenOverdueSummaryByUserId(userInfo.userId),
      this.usersBillingDayRepository.getEffectiveBillingDayForUser(userInfo.userId),
      this.invoiceCreationService.getUnbilledTotalForUser(userInfo.userId),
    ]);
    return {
      openOverdueCount: summary.count,
      openOverdueTotal: summary.totalBalance,
      billingDayOfMonth,
      unbilledTotal,
    };
  }

  @Get('open-overdue')
  async listOpenOverdue(@Req() req?: RequestWithUser): Promise<InvoiceResponseDto[]> {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }
    const rows = await this.invoiceRefsRepository.findOpenOverdueByUserId(userInfo.userId);
    return rows.map((row) => this.mapToResponse(row, row.subscription?.number));
  }

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
    const rows = await this.invoiceNinjaService.listInvoices(userInfo.userId, subscriptionId);
    return rows.map((row) => this.mapToResponse(row));
  }

  @Post(':subscriptionId')
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  async create(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Body() dto: CreateInvoiceDto,
    @Req() req?: RequestWithUser,
  ) {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return await this.invoiceCreationService.createInvoice(subscriptionId, userInfo.userId, dto.description, {
      billUntil: new Date(),
    });
  }

  @Post(':subscriptionId/ref/:invoiceRefId/refresh-link')
  async refreshInvoiceLink(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('invoiceRefId', new ParseUUIDPipe({ version: '4' })) invoiceRefId: string,
    @Req() req?: RequestWithUser,
  ): Promise<RefreshInvoiceLinkResponseDto> {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }
    await this.subscriptionService.getSubscription(subscriptionId, userInfo.userId);

    await this.invoiceNinjaService.syncCustomerProfile(userInfo.userId);
    const ref = await this.invoiceRefsRepository.findByIdAndSubscriptionId(invoiceRefId, subscriptionId);
    if (!ref) {
      throw new NotFoundException('Invoice not found');
    }

    const preAuthUrl = await this.invoiceNinjaService.getInvoiceClientLink(ref.invoiceNinjaId);
    if (!preAuthUrl) {
      throw new NotFoundException('Could not obtain invoice link from provider');
    }

    await this.invoiceRefsRepository.update(ref.id, { preAuthUrl });
    return { preAuthUrl };
  }

  private mapToResponse(row: InvoiceRefEntity, subscriptionNumber?: string): InvoiceResponseDto {
    const balance =
      row.balance !== undefined && row.balance !== null
        ? typeof row.balance === 'number'
          ? row.balance
          : parseFloat(String(row.balance))
        : undefined;
    return {
      id: row.id,
      subscriptionId: row.subscriptionId,
      invoiceNinjaId: row.invoiceNinjaId,
      invoiceNumber: row.invoiceNumber,
      preAuthUrl: row.preAuthUrl,
      status: row.status,
      balance: balance !== undefined && !Number.isNaN(balance) ? balance : undefined,
      subscriptionNumber,
      createdAt: row.createdAt,
      dueDate: row.dueDate,
    };
  }
}
