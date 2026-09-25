import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Language } from '../services/subscriberTypes.js';
import { en } from './en.js';
import { ha } from './ha.js';
import { getTemplates, render } from './index.js';
import { ig } from './ig.js';
import { pcm } from './pcm.js';
import type { TemplateSet } from './types.js';
import { yo } from './yo.js';

const ALL_SETS: Record<Language, TemplateSet> = { en, ha, yo, ig, pcm };

test('English is served as-is (reviewed by default)', () => {
  const result = getTemplates('en');
  assert.equal(result.language, 'en');
  assert.equal(result.fellBackToEnglish, false);
});

test('getTemplates matches each language\'s actual review state, whatever it currently is', () => {
  for (const [lang, set] of Object.entries(ALL_SETS) as [Language, TemplateSet][]) {
    const result = getTemplates(lang);
    const isReviewed = Boolean(set.reviewedBy && set.reviewedAt);
    assert.equal(result.fellBackToEnglish, !isReviewed, `${lang}: fellBackToEnglish should reflect whether it's reviewed`);
    assert.equal(result.language, isReviewed ? lang : 'en');
    if (isReviewed) {
      assert.equal(result.strings, set.strings, `${lang}: a reviewed language should serve its own strings, not a copy`);
    }
  }
});

test('render substitutes {variables} and leaves unknown ones untouched', () => {
  assert.equal(render('Alert for {community}!', { community: 'Lokoja' }), 'Alert for Lokoja!');
  assert.equal(render('Alert for {missing}!', {}), 'Alert for {missing}!');
});
