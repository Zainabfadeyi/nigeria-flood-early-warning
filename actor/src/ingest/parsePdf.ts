import { z } from 'zod';
import type { Community } from '@nigeria-flood/shared';
import { getLlmProvider, type LlmProvider } from '../llm/index.js';
import type { CommunityOutlookRow } from '../outlookTypes.js';
import { runSource, type SourceOutcome } from '../sources/types.js';

const outlookRowSchema = z.object({
  communityId: z.string(),
  category: z.enum(['HIGH', 'MODERATE', 'LOW']),
  confidence: z.enum(['high', 'low']),
  quote: z.string(),
});
const outlookRowsSchema = z.array(outlookRowSchema);

export interface OutlookExtraction {
  rows: CommunityOutlookRow[];
  lowConfidenceRows: CommunityOutlookRow[];
}

// Only the first slice of the document is sent to the model — our MVP
// communities are named early in these outlook documents' community tables
// in past years' AFOs, but this is a real limit worth knowing about: a
// community listed further in than this will be silently missed rather than
// found. Revisit once we can see the real 2026 document's structure.
const MAX_PDF_CHARS_TO_MODEL = 50_000;

async function fetchPdfText(url: string): Promise<SourceOutcome<string>> {
  return runSource(
    'parsePdf.fetch',
    [{ name: 'NIHSA Annual Flood Outlook PDF', url, retrievedAt: new Date().toISOString() }],
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      return parsed.text;
    },
  );
}

function buildPrompt(text: string, communities: Community[]): { system: string; user: string } {
  const communityList = communities.map((c) => `- id: ${c.id}, name: ${c.name}, LGA: ${c.lga}, state: ${c.state}`).join('\n');
  const system =
    'You extract structured flood-risk classifications from Nigerian government flood outlook documents. ' +
    'Only report a row for a community when the source text gives clear evidence tied to that specific community or its LGA by name — ' +
    'never infer a classification just from a state-wide statement. Respond with ONLY a JSON array, no prose, no markdown fences.';
  const user =
    `Here is text from the NIHSA Annual Flood Outlook document (may be truncated):\n\n${text.slice(0, MAX_PDF_CHARS_TO_MODEL)}\n\n` +
    `For each of these communities, find whether the document classifies it (or its LGA) as HIGH, MODERATE or LOW flood risk. ` +
    `Skip any community the text doesn't clearly cover.\n\n${communityList}\n\n` +
    'Respond as a JSON array of {"communityId": string, "category": "HIGH"|"MODERATE"|"LOW", "confidence": "high"|"low", "quote": string (a short verbatim snippet supporting this)}.';
  return { system, user };
}

/**
 * Runs the LLM extraction step against already-fetched document text. Split
 * out from fetchAndExtractOutlook so it can be unit-tested with a fake
 * LlmProvider and fixed text, without needing a real PDF or API key.
 */
export async function extractOutlookFromText(text: string, communities: Community[], llm: LlmProvider): Promise<SourceOutcome<OutlookExtraction>> {
  if (llm.name === 'none') {
    return { data: null, warnings: ['No LLM provider configured; cannot extract structured data from the fetched PDF text.'], sources: [] };
  }

  const { system, user } = buildPrompt(text, communities);
  const extraction = await llm.extractJson(system, user);
  if (extraction.data === null) {
    return { data: null, warnings: extraction.warnings, sources: [] };
  }

  const parsed = outlookRowsSchema.safeParse(extraction.data);
  if (!parsed.success) {
    return { data: null, warnings: [`LLM output failed schema validation: ${parsed.error.message}`], sources: [] };
  }

  const rows = parsed.data;
  return {
    data: {
      rows: rows.filter((r) => r.confidence === 'high'),
      lowConfidenceRows: rows.filter((r) => r.confidence === 'low'),
    },
    warnings: [],
    sources: [],
  };
}

/** Fetches the AFO PDF and extracts per-community categories scoped to our MVP community list. `data: null` (not a thrown error) means "unreachable/unusable right now" — callers should fall back to other sourced data. */
export async function fetchAndExtractOutlook(pdfUrl: string, communities: Community[], llm: LlmProvider = getLlmProvider()): Promise<SourceOutcome<OutlookExtraction>> {
  const textResult = await fetchPdfText(pdfUrl);
  if (!textResult.data) {
    return { data: null, warnings: textResult.warnings, sources: [] };
  }

  const extraction = await extractOutlookFromText(textResult.data, communities, llm);
  return { ...extraction, warnings: [...textResult.warnings, ...extraction.warnings], sources: textResult.sources };
}
