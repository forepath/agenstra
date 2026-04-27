import { Injectable } from '@nestjs/common';

import { buildPromptEnhancementMessage } from '../utils/chat-enhancement-prompt.utils';
import { buildTicketBodyFromTitleMessage } from '../utils/ticket-body-prompt.utils';

interface ContextInjectionPayload {
  includeWorkspace?: boolean;
  environmentIds?: string[];
  ticketShas?: string[];
  ticketContexts?: string[];
}

@Injectable()
export class PromptContextComposerService {
  private buildContextPreamble(contextInjection?: ContextInjectionPayload): string {
    if (!contextInjection) {
      return '';
    }

    const lines: string[] = [];

    if (contextInjection.includeWorkspace) {
      lines.push('- Shared workspace context is mounted at /opt/workspace (read-only).');
    }

    const environmentIds = (contextInjection.environmentIds ?? []).filter((id) => id.trim().length > 0);
    const ticketShas = (contextInjection.ticketShas ?? []).filter((sha) => sha.trim().length > 0);
    const ticketContexts = (contextInjection.ticketContexts ?? []).filter((ctx) => ctx.trim().length > 0);

    if (environmentIds.length > 0) {
      lines.push(`- Relevant environment ids for context: ${environmentIds.join(', ')}`);
    }

    if (ticketShas.length > 0) {
      lines.push(`- Relevant ticket references for context: ${ticketShas.join(', ')}`);
    }

    if (ticketContexts.length > 0) {
      lines.push('- Detailed ticket hierarchy context is provided below:');
      for (const [index, context] of ticketContexts.entries()) {
        lines.push(`Ticket context #${index + 1}:`);
        lines.push(context.trim());
      }
    }

    if (lines.length === 0) {
      return '';
    }

    return [
      '<hidden-context>',
      'Use only these additional context hints while answering:',
      ...lines,
      '</hidden-context>',
      '',
    ].join('\n');
  }

  composeChatMessage(message: string, contextInjection?: ContextInjectionPayload): string {
    const preamble = this.buildContextPreamble(contextInjection);

    return preamble ? `${preamble}${message}` : message;
  }

  composeEnhanceMessage(message: string, contextInjection?: ContextInjectionPayload): string {
    return buildPromptEnhancementMessage(this.composeChatMessage(message, contextInjection));
  }

  composeTicketBodyMessage(
    title: string,
    hierarchyContext?: string,
    contextInjection?: ContextInjectionPayload,
  ): string {
    return buildTicketBodyFromTitleMessage(this.composeChatMessage(title, contextInjection), hierarchyContext);
  }
}
