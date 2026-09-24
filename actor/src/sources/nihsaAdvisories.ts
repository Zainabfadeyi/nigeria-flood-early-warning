export interface AdvisoryRecord {
  states: string[];
  severity: 'HIGH' | 'MEDIUM';
  issuedAt: string;
  validFrom: string;
  validTo: string;
  sourceName: string;
  sourceUrl: string;
}

/**
 * Phase 4 real data. Unlike the outlook PDF (see nihsaOutlook.ts /
 * ingest/parsePdf.ts), there's no live-fetch-and-parse path here: we don't
 * know what nihsa.gov.ng's advisories page actually looks like (it's been
 * unreachable through every phase of this build — see sources/README.md),
 * so there's no markup to write a scraper against yet. This is hand-entered
 * from news coverage that was independently corroborated across three
 * separately-fetched primary articles (see sources/README.md's methodology
 * note — an earlier AI search summary invented a fake advisory ID that none
 * of these three actually contained, which is exactly why they were checked
 * individually rather than trusted from a synthesized answer).
 */
const REAL_ADVISORIES: AdvisoryRecord[] = [
  {
    states: ['Imo', 'Cross River', 'Ebonyi', 'Benue', 'Anambra', 'Akwa Ibom', 'Lagos', 'Rivers', 'Edo', 'Kogi', 'Taraba', 'Delta', 'Bayelsa', 'Enugu', 'Abia'],
    severity: 'HIGH',
    issuedAt: '2026-09-19',
    validFrom: '2026-09-19',
    validTo: '2026-09-25',
    sourceName: 'NIHSA riverine flood-risk advisory (via NEMA/news coverage)',
    sourceUrl: 'https://allafrica.com/stories/202609220244.html',
  },
];

function isoToday(asOf: Date): string {
  return asOf.toISOString().slice(0, 10);
}

export function isAdvisoryActive(state: string, asOf: Date = new Date()): { active: boolean; matchedAdvisory?: AdvisoryRecord; warnings: string[] } {
  const today = isoToday(asOf);
  const match = REAL_ADVISORIES.find((advisory) => today >= advisory.validFrom && today <= advisory.validTo && advisory.states.some((s) => s.toLowerCase() === state.toLowerCase()));
  return {
    active: Boolean(match),
    ...(match ? { matchedAdvisory: match } : {}),
    warnings: [
      'NIHSA advisory data is hand-entered from verified news coverage of NEMA/NIHSA statements, not a live nihsa.gov.ng fetch (site unreachable — see sources/README.md); it will go stale once the listed advisories expire and none are added to replace them.',
    ],
  };
}
