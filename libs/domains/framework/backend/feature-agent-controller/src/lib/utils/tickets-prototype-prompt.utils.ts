import { TicketPriority, TicketStatus } from '../entities/ticket.enums';

export interface TicketPromptNode {
  id: string;
  title: string;
  content?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  children: TicketPromptNode[];
}

/**
 * Builds a plain-text prompt describing the ticket tree for agent prototyping.
 */
export function buildPrototypePrompt(root: TicketPromptNode, depth = 0): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [`${indent}- [${root.id}] ${root.title} (${root.status}, ${root.priority})`];
  if (root.content?.trim()) {
    lines.push(`${indent}  Content:\n${indent}  ${root.content.trim().split('\n').join(`\n${indent}  `)}`);
  }
  for (const child of root.children) {
    lines.push(buildPrototypePrompt(child, depth + 1));
  }
  return lines.join('\n');
}

export function buildPrototypePromptPreamble(): string {
  return `You are helping implement a scoped piece of work. Below is the ticket specification tree (root and all subtasks). Use this context to produce a concrete prototype or implementation plan as requested by the user.\n\nTicket tree:\n`;
}
