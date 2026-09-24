export const OUTLOOK_CATEGORIES = ['HIGH', 'MODERATE', 'LOW', 'NOT_LISTED'] as const;
export type OutlookCategory = (typeof OUTLOOK_CATEGORIES)[number];

/** One row of LLM-extracted structured data from the AFO PDF (see ingest/parsePdf.ts). */
export interface CommunityOutlookRow {
  communityId: string;
  category: Exclude<OutlookCategory, 'NOT_LISTED'>;
  confidence: 'high' | 'low';
  /** Verbatim snippet from the source text supporting this classification, kept for human review. */
  quote: string;
}
