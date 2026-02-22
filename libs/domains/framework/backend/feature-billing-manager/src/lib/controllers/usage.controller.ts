import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateUsageRecordDto } from '../dto/create-usage-record.dto';
import { UsageSummaryDto } from '../dto/usage-summary.dto';
import { UsageService } from '../services/usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('summary/:subscriptionId')
  async summary(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
  ): Promise<UsageSummaryDto> {
    const usage = await this.usageService.getLatestUsage(subscriptionId);
    if (!usage) {
      return {
        subscriptionId,
        periodStart: new Date(0),
        periodEnd: new Date(0),
        usagePayload: {},
      };
    }
    return {
      subscriptionId: usage.subscriptionId,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      usagePayload: usage.usagePayload,
    };
  }

  @Post('record')
  async record(@Body() body: CreateUsageRecordDto) {
    const record = await this.usageService.createUsage({
      subscriptionId: body.subscriptionId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      usagePayload: body.usagePayload ?? {},
      usageSource: 'dataset',
    });
    return { id: record.id };
  }
}
