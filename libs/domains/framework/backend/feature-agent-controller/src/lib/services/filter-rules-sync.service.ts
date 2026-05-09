import type {
  CreateRegexFilterRuleDto,
  UpdateRegexFilterRuleDto,
} from '@forepath/framework/backend/feature-agent-manager';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { AgentConsoleRegexFilterRuleSyncTargetEntity } from '../entities/agent-console-regex-filter-rule-sync-target.entity';
import { AgentConsoleRegexFilterRuleEntity } from '../entities/agent-console-regex-filter-rule.entity';

import { AgentManagerFilterRulesClientService } from './agent-manager-filter-rules-client.service';

/**
 * Pushes filter rule changes to each workspace agent-manager (sync targets).
 */
@Injectable()
export class FilterRulesSyncService {
  private readonly logger = new Logger(FilterRulesSyncService.name);

  constructor(
    @InjectRepository(AgentConsoleRegexFilterRuleSyncTargetEntity)
    private readonly targetsRepo: Repository<AgentConsoleRegexFilterRuleSyncTargetEntity>,
    @InjectRepository(AgentConsoleRegexFilterRuleEntity)
    private readonly rulesRepo: Repository<AgentConsoleRegexFilterRuleEntity>,
    private readonly agentManagerClient: AgentManagerFilterRulesClientService,
  ) {}

  /**
   * @returns number of targets processed
   */
  async processBatch(max: number): Promise<number> {
    const rows = await this.targetsRepo
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.rule', 'rule')
      .where('t.sync_status IN (:...st)', { st: ['pending', 'failed'] })
      .andWhere(
        new Brackets((qb) => {
          qb.where('(t.desired_on_manager = true AND rule.enabled = true)').orWhere(
            '(t.desired_on_manager = false AND t.manager_rule_id IS NOT NULL)',
          );
        }),
      )
      .orderBy('t.updatedAt', 'ASC')
      .take(max)
      .getMany();

    for (const t of rows) {
      await this.processOne(t);
    }

    return rows.length;
  }

  private toCreateDto(rule: AgentConsoleRegexFilterRuleEntity): CreateRegexFilterRuleDto {
    return {
      pattern: rule.pattern,
      regexFlags: rule.regexFlags,
      direction: rule.direction,
      filterType: rule.filterType,
      replaceContent: rule.filterType === 'filter' ? (rule.replaceContent ?? undefined) : undefined,
      priority: rule.priority,
    };
  }

  private toUpdateDto(rule: AgentConsoleRegexFilterRuleEntity): UpdateRegexFilterRuleDto {
    return {
      pattern: rule.pattern,
      regexFlags: rule.regexFlags,
      direction: rule.direction,
      filterType: rule.filterType,
      replaceContent: rule.filterType === 'filter' ? (rule.replaceContent ?? undefined) : null,
      priority: rule.priority,
    };
  }

  private async processOne(
    target: AgentConsoleRegexFilterRuleSyncTargetEntity & { rule: AgentConsoleRegexFilterRuleEntity },
  ): Promise<void> {
    const rule = target.rule;

    try {
      if (!target.desiredOnManager) {
        if (target.managerRuleId) {
          await this.agentManagerClient.deleteRule(target.clientId, target.managerRuleId);
        }

        target.managerRuleId = null;
        target.syncStatus = 'synced';
        target.lastError = null;
        target.lastSyncedAt = new Date();
        await this.targetsRepo.save(target);

        return;
      }

      if (!target.managerRuleId) {
        const created = await this.agentManagerClient.createRule(target.clientId, this.toCreateDto(rule));

        target.managerRuleId = created.id;
      } else {
        await this.agentManagerClient.updateRule(target.clientId, target.managerRuleId, this.toUpdateDto(rule));
      }

      target.syncStatus = 'synced';
      target.lastError = null;
      target.lastSyncedAt = new Date();
      await this.targetsRepo.save(target);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      this.logger.warn(`Sync failed for target ${target.id} client ${target.clientId}: ${msg}`);
      target.syncStatus = 'failed';
      target.lastError = msg;
      await this.targetsRepo.save(target);
    }
  }
}
