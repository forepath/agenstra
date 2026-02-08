/**
 * DTO for statistics summary (totals and filter breakdown).
 */
export class StatisticsSummaryDto {
  totalMessages!: number;
  totalWords!: number;
  totalChars!: number;
  avgWordsPerMessage!: number;
  filterDropCount!: number;
  filterTypesBreakdown!: { filterType: string; direction: string; count: number }[];
  filterFlagCount!: number;
  filterFlagsBreakdown!: { filterType: string; direction: string; count: number }[];
  series?: { period: string; count: number; wordCount: number; charCount: number }[];
}
