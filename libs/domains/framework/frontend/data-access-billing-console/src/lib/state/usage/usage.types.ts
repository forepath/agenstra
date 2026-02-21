export interface UsageSummaryDto {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  totalUsage?: Record<string, unknown>;
  breakdown?: UsageBreakdownItem[];
}

export interface UsageBreakdownItem {
  metric: string;
  value: number;
  unit: string;
  cost?: string;
}

export interface CreateUsageRecordDto {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  usagePayload: Record<string, unknown>;
}
