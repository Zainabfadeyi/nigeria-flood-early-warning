import type { Language } from '../services/subscriberTypes.js';
import { en } from './en.js';
import { ha } from './ha.js';
import { ig } from './ig.js';
import { pcm } from './pcm.js';
import type { TemplateSet, TemplateStrings } from './types.js';
import { yo } from './yo.js';

export { render } from './types.js';

const TEMPLATE_SETS: Record<Language, TemplateSet> = { en, ha, yo, ig, pcm };

export interface ResolvedTemplates {
  language: Language;
  strings: TemplateStrings;
  fellBackToEnglish: boolean;
}

/** CLAUDE.md section 8: refuse to send an unreviewed language, fall back to English and log it. */
export function getTemplates(language: Language): ResolvedTemplates {
  const requested = TEMPLATE_SETS[language];
  if (requested.reviewedBy && requested.reviewedAt) {
    return { language, strings: requested.strings, fellBackToEnglish: false };
  }
  console.warn(`Templates for "${language}" are not yet reviewed (reviewedBy is null) — falling back to English.`);
  return { language: 'en', strings: en.strings, fellBackToEnglish: true };
}
