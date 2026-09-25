import { Actor } from 'apify';
import type { Community } from '@nigeria-flood/shared';
import { fetchAndExtractOutlook } from '../ingest/parsePdf.js';
import type { CommunityOutlookRow, OutlookCategory } from '../outlookTypes.js';

export { OUTLOOK_CATEGORIES, type OutlookCategory } from '../outlookTypes.js';

// Unconfirmed path guessed from a search-engine cache in Phase 1 (see
// sources/README.md) — nihsa.gov.ng has been unreachable throughout Phases
// 1-4, so this has never actually resolved. Kept here so refreshOutlookFromPdf
// starts working automatically the moment the site is back, with no code
// change needed.
const AFO_PDF_URL = 'https://nihsa.gov.ng/storage/publications/2026_AFO.pdf';

interface FallbackRecord {
  category: Exclude<OutlookCategory, 'NOT_LISTED'>;
  sourceName: string;
  sourceUrl: string;
}

/**
 * Phase 4 real data, used whenever the AFO PDF itself is unreachable (true
 * for every run so far). Each entry is independently verified against a
 * specific news report naming this LGA by name — attributed to NEMA, a state
 * emergency management agency, or NIHSA itself, dated 2026 — not inferred
 * from a generic "33 states at risk" headline (see actor/src/SCORING.md for
 * why that state-level framing turned out to be too coarse to be useful: it
 * covers nearly every state in the country). All 13 MVP communities came
 * back HIGH, which should be read as selection bias — CLAUDE.md picked these
 * communities specifically because they sit on the Niger/Benue confluence
 * system, not as evidence the classification is trivially always HIGH.
 */
const FALLBACK_OUTLOOK_BY_COMMUNITY: Record<string, FallbackRecord> = {
  'kogi-lokoja': {
    category: 'HIGH',
    sourceName: 'NEMA/Kogi SEMA 2026 flood-preparedness stakeholders meeting (10 Kogi LGAs listed high-risk)',
    sourceUrl: 'https://thenigerianpost.com.ng/sema-stakeholders-meeting-nema-lists-10-kogi-lgas-as-high-flood-risk-areas-ahead-of-2026-rainy-season/',
  },
  'kogi-ajaokuta': {
    category: 'HIGH',
    sourceName: 'NEMA/Kogi SEMA 2026 flood-preparedness stakeholders meeting (10 Kogi LGAs listed high-risk)',
    sourceUrl: 'https://thenigerianpost.com.ng/sema-stakeholders-meeting-nema-lists-10-kogi-lgas-as-high-flood-risk-areas-ahead-of-2026-rainy-season/',
  },
  'kogi-ibaji': {
    category: 'HIGH',
    sourceName: 'NEMA/Kogi SEMA 2026 flood-preparedness stakeholders meeting (10 Kogi LGAs listed high-risk)',
    sourceUrl: 'https://thenigerianpost.com.ng/sema-stakeholders-meeting-nema-lists-10-kogi-lgas-as-high-flood-risk-areas-ahead-of-2026-rainy-season/',
  },
  'benue-makurdi': {
    category: 'HIGH',
    sourceName: 'National Flood Early Warning Systems Centre prediction, 2026-08-15 (critical risk), via Premium Times',
    sourceUrl: 'https://www.premiumtimesng.com/regional/north-central/911211-flood-nema-urges-benue-to-strengthen-preparedness.html',
  },
  'benue-agatu': {
    category: 'HIGH',
    sourceName: 'National Flood Early Warning Systems Centre prediction, 2026-08-15 (critical risk), via Premium Times',
    sourceUrl: 'https://www.premiumtimesng.com/regional/north-central/911211-flood-nema-urges-benue-to-strengthen-preparedness.html',
  },
  'benue-guma': {
    category: 'HIGH',
    sourceName: 'National Flood Early Warning Systems Centre prediction, 2026-08-15 (critical risk), via Premium Times',
    sourceUrl: 'https://www.premiumtimesng.com/regional/north-central/911211-flood-nema-urges-benue-to-strengthen-preparedness.html',
  },
  'adamawa-yola': {
    category: 'HIGH',
    sourceName: 'ADSEMA Executive Secretary Dr Celine Laori, 2026-07-22',
    sourceUrl: 'https://pmnewsnigeria.com/2026/07/22/flood-borno-adamawa-yobe-reveal-response-strategies-evacuation-plans/',
  },
  'adamawa-numan': {
    category: 'HIGH',
    sourceName: 'ADSEMA Executive Secretary Dr Celine Laori, 2026-07-22 / NIHSA 7-day advisory, 2026-07-03',
    sourceUrl: 'https://pmnewsnigeria.com/2026/07/22/flood-borno-adamawa-yobe-reveal-response-strategies-evacuation-plans/',
  },
  'adamawa-demsa': {
    category: 'HIGH',
    sourceName: 'ADSEMA Executive Secretary Dr Celine Laori, 2026-07-22',
    sourceUrl: 'https://pmnewsnigeria.com/2026/07/22/flood-borno-adamawa-yobe-reveal-response-strategies-evacuation-plans/',
  },
  'anambra-onitsha': {
    category: 'HIGH',
    sourceName: "NIHSA 2026 seasonal climate prediction assessment / Sept 19-25 advisory coverage",
    sourceUrl: 'https://allafrica.com/stories/202609220244.html',
  },
  'anambra-atani': {
    category: 'HIGH',
    sourceName: "NIHSA 2026 seasonal climate prediction assessment / Sept 19-25 advisory coverage (Ogbaru)",
    sourceUrl: 'https://allafrica.com/stories/202609220244.html',
  },
  'anambra-west-nzam': {
    category: 'HIGH',
    sourceName: "NIHSA 2026 seasonal climate prediction assessment / Sept 19-25 advisory coverage (Anambra West)",
    sourceUrl: 'https://allafrica.com/stories/202609220244.html',
  },
  'anambra-otuocha': {
    category: 'HIGH',
    sourceName: "NIHSA 2026 seasonal climate prediction assessment / Sept 19-25 advisory coverage (Anambra East)",
    sourceUrl: 'https://allafrica.com/stories/202609220244.html',
  },
  'lagos-ikorodu': {
    category: 'HIGH',
    sourceName: 'NEMA flood-preparedness report naming Ikorodu directly, 2026-06-05',
    sourceUrl: 'https://allafrica.com/stories/202606050458.html',
  },
};

let pdfRows: Map<string, CommunityOutlookRow> | null = null;
let refreshPromise: Promise<string[]> | null = null;

async function doRefresh(communities: Community[]): Promise<string[]> {
  const result = await fetchAndExtractOutlook(AFO_PDF_URL, communities);
  if (result.data) {
    pdfRows = new Map(result.data.rows.map((r) => [r.communityId, r]));
    if (result.data.lowConfidenceRows.length > 0) {
      try {
        const store = await Actor.openKeyValueStore('nihsa-outlook-review');
        await store.setValue('low-confidence-rows', result.data.lowConfidenceRows);
      } catch (error) {
        // Reviewing low-confidence rows is a nice-to-have; don't fail the run over it.
        console.warn(`Could not write nihsa-outlook-review: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return result.warnings;
}

/** Call once per actor run, before scoring. Tries the real AFO PDF; getOutlookCategory below falls back to FALLBACK_OUTLOOK_BY_COMMUNITY for anything it didn't find. */
export async function refreshOutlookFromPdf(communities: Community[]): Promise<string[]> {
  refreshPromise ??= doRefresh(communities);
  return refreshPromise;
}

export function getOutlookCategory(community: Community): { category: OutlookCategory; sourceUrl?: string; warnings: string[] } {
  const fromPdf = pdfRows?.get(community.id);
  if (fromPdf) {
    return { category: fromPdf.category, warnings: [] };
  }

  const fallback = FALLBACK_OUTLOOK_BY_COMMUNITY[community.id];
  return {
    category: fallback?.category ?? 'NOT_LISTED',
    ...(fallback ? { sourceUrl: fallback.sourceUrl } : {}),
    warnings: [
      `NIHSA outlook: AFO PDF unreachable (see actor/src/sources/README.md); using ${fallback ? fallback.sourceName : 'no available source for this community'}.`,
    ],
  };
}
