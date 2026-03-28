/**
 * Isolated agent session suffix for ticket body generation (title → description).
 */
export const PROMPT_TICKET_BODY_RESUME_SESSION_SUFFIX = '-ticket-body';

/**
 * Wraps the ticket title so the model returns only ticket description/body text.
 */
export function buildTicketBodyFromTitleMessage(title: string): string {
  return `You are a product/spec assistant. The ticket title is between <<<TITLE>>> and <<<END_TITLE>>>.
Write clear ticket body content: acceptance criteria, technical notes, and context. Use markdown where helpful.
Output ONLY the body text for the ticket. No preamble, no "Here is", no code fences wrapping the entire answer.

<<<TITLE>>>
${title.trim()}
<<<END_TITLE>>>`;
}
