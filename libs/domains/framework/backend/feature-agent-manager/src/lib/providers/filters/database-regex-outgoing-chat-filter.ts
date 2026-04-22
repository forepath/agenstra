import { Injectable } from '@nestjs/common';
import { ChatFilter, FilterContext, FilterDirection, FilterResult } from '../chat-filter.interface';
import { RegexFilterRulesEvaluateService } from '../../services/regex-filter-rules-evaluate.service';

@Injectable()
export class DatabaseRegexOutgoingChatFilter implements ChatFilter {
  private static readonly TYPE = 'database-regex-outgoing';

  constructor(private readonly evaluateService: RegexFilterRulesEvaluateService) {}

  getType(): string {
    return DatabaseRegexOutgoingChatFilter.TYPE;
  }

  getDisplayName(): string {
    return 'Database regex rules (outgoing)';
  }

  getDirection(): FilterDirection {
    return FilterDirection.OUTGOING;
  }

  async filter(message: string, _context?: FilterContext): Promise<FilterResult> {
    return await this.evaluateService.evaluate(message, FilterDirection.OUTGOING);
  }
}
