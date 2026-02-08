import { BadRequestException, Injectable } from '@nestjs/common';
import {
  StatisticsChatIoListDto,
  StatisticsChatIoDto,
  StatisticsEntityEventListDto,
  StatisticsEntityEventDto,
  StatisticsFilterDropListDto,
  StatisticsFilterDropDto,
  StatisticsFilterFlagListDto,
  StatisticsFilterFlagDto,
  StatisticsSummaryDto,
} from '../dto/statistics';
import { ChatDirection } from '../entities/statistics-chat-io.entity';
import { StatisticsEntityEventType, StatisticsEntityType } from '../entities/statistics-entity-event.entity';
import { StatisticsRepository } from '../repositories/statistics.repository';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateIsoDate(value: string | undefined, paramName: string): string | undefined {
  if (!value) return undefined;
  if (!ISO_DATE_REGEX.test(value)) {
    throw new BadRequestException(`${paramName} must be a valid ISO 8601 date string`);
  }
  return value;
}

/** Normalize date-only "to" param to end-of-day so the full day is included. */
function normalizeToEndOfDay(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (DATE_ONLY_REGEX.test(value)) {
    return `${value}T23:59:59.999Z`;
  }
  return value;
}

@Injectable()
export class StatisticsQueryService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}

  private async resolveStatisticsClientIds(originalClientIds: string[]): Promise<string[]> {
    if (originalClientIds.length === 0) return [];
    return await this.statisticsRepository.findStatisticsClientIdsByOriginalIds(originalClientIds);
  }

  async getClientSummary(
    clientId: string,
    params: { from?: string; to?: string; groupBy?: 'day' | 'hour' },
  ): Promise<StatisticsSummaryDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds([clientId]);
    if (ids.length === 0) {
      return {
        totalMessages: 0,
        totalWords: 0,
        totalChars: 0,
        avgWordsPerMessage: 0,
        filterDropCount: 0,
        filterTypesBreakdown: [],
        filterFlagCount: 0,
        filterFlagsBreakdown: [],
      };
    }

    const [chatAgg, filterDropAgg, filterFlagAgg] = await Promise.all([
      this.statisticsRepository.queryChatIoAggregate({
        statisticsClientIds: ids,
        from,
        to,
        groupBy: params.groupBy,
      }),
      this.statisticsRepository.queryFilterDropsAggregate({ statisticsClientIds: ids, from, to }),
      this.statisticsRepository.queryFilterFlagsAggregate({ statisticsClientIds: ids, from, to }),
    ]);

    return {
      totalMessages: chatAgg.totalMessages,
      totalWords: chatAgg.totalWords,
      totalChars: chatAgg.totalChars,
      avgWordsPerMessage: chatAgg.avgWordsPerMessage,
      filterDropCount: filterDropAgg.filterDropCount,
      filterTypesBreakdown: filterDropAgg.filterTypesBreakdown,
      filterFlagCount: filterFlagAgg.filterFlagCount,
      filterFlagsBreakdown: filterFlagAgg.filterTypesBreakdown,
      series: chatAgg.series,
    };
  }

  async getSummary(
    accessibleClientIds: string[],
    params: { from?: string; to?: string; groupBy?: 'day' | 'hour' },
  ): Promise<StatisticsSummaryDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds(accessibleClientIds);
    if (ids.length === 0) {
      return {
        totalMessages: 0,
        totalWords: 0,
        totalChars: 0,
        avgWordsPerMessage: 0,
        filterDropCount: 0,
        filterTypesBreakdown: [],
        filterFlagCount: 0,
        filterFlagsBreakdown: [],
      };
    }

    const [chatAgg, filterDropAgg, filterFlagAgg] = await Promise.all([
      this.statisticsRepository.queryChatIoAggregate({
        statisticsClientIds: ids,
        from,
        to,
        groupBy: params.groupBy,
      }),
      this.statisticsRepository.queryFilterDropsAggregate({ statisticsClientIds: ids, from, to }),
      this.statisticsRepository.queryFilterFlagsAggregate({ statisticsClientIds: ids, from, to }),
    ]);

    return {
      totalMessages: chatAgg.totalMessages,
      totalWords: chatAgg.totalWords,
      totalChars: chatAgg.totalChars,
      avgWordsPerMessage: chatAgg.avgWordsPerMessage,
      filterDropCount: filterDropAgg.filterDropCount,
      filterTypesBreakdown: filterDropAgg.filterTypesBreakdown,
      filterFlagCount: filterFlagAgg.filterFlagCount,
      filterFlagsBreakdown: filterFlagAgg.filterTypesBreakdown,
      series: chatAgg.series,
    };
  }

  async getClientChatIo(
    clientId: string,
    params: {
      agentId?: string;
      from?: string;
      to?: string;
      direction?: ChatDirection;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsChatIoListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds([clientId]);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryChatIo({
      statisticsClientIds: ids,
      agentId: params.agentId,
      from,
      to,
      direction: params.direction,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsChatIoDto[] = rows.map((r) => ({
      id: r.id,
      clientId: r.statisticsClient?.originalClientId ?? r.statisticsClientId,
      agentId: r.statisticsAgent?.originalAgentId,
      clientName: r.statisticsClient?.name,
      agentName: r.statisticsAgent?.name,
      originalUserId: r.statisticsUser?.originalUserId,
      direction: r.direction,
      wordCount: r.wordCount,
      charCount: r.charCount,
      occurredAt: r.occurredAt,
    }));

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getChatIo(
    accessibleClientIds: string[],
    params: {
      agentId?: string;
      from?: string;
      to?: string;
      direction?: ChatDirection;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsChatIoListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds(accessibleClientIds);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryChatIo({
      statisticsClientIds: ids,
      agentId: params.agentId,
      from,
      to,
      direction: params.direction,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsChatIoDto[] = rows.map((r) => ({
      id: r.id,
      clientId: r.statisticsClient?.originalClientId ?? r.statisticsClientId,
      agentId: r.statisticsAgent?.originalAgentId,
      clientName: r.statisticsClient?.name,
      agentName: r.statisticsAgent?.name,
      originalUserId: r.statisticsUser?.originalUserId,
      direction: r.direction,
      wordCount: r.wordCount,
      charCount: r.charCount,
      occurredAt: r.occurredAt,
    }));

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getClientFilterDrops(
    clientId: string,
    params: {
      agentId?: string;
      filterType?: string;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsFilterDropListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds([clientId]);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryFilterDrops({
      statisticsClientIds: ids,
      agentId: params.agentId,
      filterType: params.filterType,
      from,
      to,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsFilterDropDto[] = rows.map((r) => ({
      id: r.id,
      clientId: r.statisticsClient?.originalClientId ?? r.statisticsClientId,
      agentId: r.statisticsAgent?.originalAgentId,
      clientName: r.statisticsClient?.name,
      agentName: r.statisticsAgent?.name,
      originalUserId: r.statisticsUser?.originalUserId,
      filterType: r.filterType,
      filterDisplayName: r.filterDisplayName,
      filterReason: r.filterReason,
      direction: r.direction,
      wordCount: r.wordCount,
      charCount: r.charCount,
      occurredAt: r.occurredAt,
    }));

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getFilterDrops(
    accessibleClientIds: string[],
    params: {
      agentId?: string;
      filterType?: string;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsFilterDropListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds(accessibleClientIds);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryFilterDrops({
      statisticsClientIds: ids,
      agentId: params.agentId,
      filterType: params.filterType,
      from,
      to,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsFilterDropDto[] = rows.map((r) => ({
      id: r.id,
      clientId: r.statisticsClient?.originalClientId ?? r.statisticsClientId,
      agentId: r.statisticsAgent?.originalAgentId,
      clientName: r.statisticsClient?.name,
      agentName: r.statisticsAgent?.name,
      originalUserId: r.statisticsUser?.originalUserId,
      filterType: r.filterType,
      filterDisplayName: r.filterDisplayName,
      filterReason: r.filterReason,
      direction: r.direction,
      wordCount: r.wordCount,
      charCount: r.charCount,
      occurredAt: r.occurredAt,
    }));

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getClientFilterFlags(
    clientId: string,
    params: {
      agentId?: string;
      filterType?: string;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsFilterFlagListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds([clientId]);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryFilterFlags({
      statisticsClientIds: ids,
      agentId: params.agentId,
      filterType: params.filterType,
      from,
      to,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsFilterFlagDto[] = rows.map((r) => ({
      id: r.id,
      clientId: r.statisticsClient?.originalClientId ?? r.statisticsClientId,
      agentId: r.statisticsAgent?.originalAgentId,
      clientName: r.statisticsClient?.name,
      agentName: r.statisticsAgent?.name,
      originalUserId: r.statisticsUser?.originalUserId,
      filterType: r.filterType,
      filterDisplayName: r.filterDisplayName,
      filterReason: r.filterReason,
      direction: r.direction,
      wordCount: r.wordCount,
      charCount: r.charCount,
      occurredAt: r.occurredAt,
    }));

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getFilterFlags(
    accessibleClientIds: string[],
    params: {
      agentId?: string;
      filterType?: string;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsFilterFlagListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds(accessibleClientIds);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryFilterFlags({
      statisticsClientIds: ids,
      agentId: params.agentId,
      filterType: params.filterType,
      from,
      to,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsFilterFlagDto[] = rows.map((r) => ({
      id: r.id,
      clientId: r.statisticsClient?.originalClientId ?? r.statisticsClientId,
      agentId: r.statisticsAgent?.originalAgentId,
      clientName: r.statisticsClient?.name,
      agentName: r.statisticsAgent?.name,
      originalUserId: r.statisticsUser?.originalUserId,
      filterType: r.filterType,
      filterDisplayName: r.filterDisplayName,
      filterReason: r.filterReason,
      direction: r.direction,
      wordCount: r.wordCount,
      charCount: r.charCount,
      occurredAt: r.occurredAt,
    }));

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getClientEntityEvents(
    clientId: string,
    params: {
      entityType?: StatisticsEntityType;
      eventType?: StatisticsEntityEventType;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsEntityEventListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds([clientId]);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryEntityEvents({
      statisticsClientIds: ids,
      entityType: params.entityType,
      eventType: params.eventType,
      from,
      to,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsEntityEventDto[] = rows.map((r) => {
      const agent = r.statisticsAgents;
      return {
        id: r.id,
        entityType: r.entityType,
        eventType: r.eventType,
        originalEntityId: r.originalEntityId,
        originalUserId: r.statisticsUser?.originalUserId,
        clientId: agent?.statisticsClient?.originalClientId,
        agentId: agent?.originalAgentId,
        clientName: agent?.statisticsClient?.name,
        agentName: agent?.name,
        occurredAt: r.occurredAt,
      };
    });

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }

  async getEntityEvents(
    accessibleClientIds: string[],
    params: {
      entityType?: StatisticsEntityType;
      eventType?: StatisticsEntityEventType;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<StatisticsEntityEventListDto> {
    const from = validateIsoDate(params.from, 'from');
    const to = normalizeToEndOfDay(validateIsoDate(params.to, 'to'));
    const ids = await this.resolveStatisticsClientIds(accessibleClientIds);
    if (ids.length === 0) {
      return { data: [], total: 0, limit: params.limit ?? 10, offset: params.offset ?? 0 };
    }

    const { rows, total } = await this.statisticsRepository.queryEntityEvents({
      statisticsClientIds: ids,
      entityType: params.entityType,
      eventType: params.eventType,
      from,
      to,
      search: params.search,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });

    const data: StatisticsEntityEventDto[] = rows.map((r) => {
      const agent = r.statisticsAgents;
      return {
        id: r.id,
        entityType: r.entityType,
        eventType: r.eventType,
        originalEntityId: r.originalEntityId,
        originalUserId: r.statisticsUser?.originalUserId,
        clientId: agent?.statisticsClient?.originalClientId,
        agentId: agent?.originalAgentId,
        clientName: agent?.statisticsClient?.name,
        agentName: agent?.name,
        occurredAt: r.occurredAt,
      };
    });

    return {
      data,
      total,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
  }
}
