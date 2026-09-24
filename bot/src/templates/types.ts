export interface TemplateStrings {
  /** Sent right after a language is chosen: confirms it, explains what they signed up for, how to stop, and asks for their location. */
  welcome: string;
  locationConfirm: string;
  locationNotRecognized: string;
  subscribed: string;
  alreadySubscribed: string;
  unsubscribed: string;
  helpMenu: string;
  outsideCoverage: string;
  /** Short, business-initiated alert (CLAUDE.md section 8) — kept minimal since a real launch needs this pre-approved as a WhatsApp template message outside the 24h session window. */
  alertShort: string;
  /** Sent once the user has replied (reopening the 24h session), so this can be as long/detailed as needed without template approval. */
  alertFull: string;
  /** Sent instead of alertShort when SEVERE has already been alerted and is persisting — see flows/alerts.ts's 48h reminder rule. */
  alertReminder: string;
}

export interface TemplateSet {
  /** null = draft, not yet approved by a native speaker. CLAUDE.md section 8: refuse to send an unreviewed language, fall back to English and log it. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  strings: TemplateStrings;
}

export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}
