/**
 * Invoice Ninja status_id values considered "open" or "overdue" (not paid, not cancelled).
 * 1=draft, 2=sent, 3=viewed, 4=partial, 5=paid, 6=overdue.
 */
export const OPEN_OVERDUE_INVOICE_STATUS_IDS = ['1', '2', '3', '4', '6'] as const;
