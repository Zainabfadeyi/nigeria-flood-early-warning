import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTemplates, render } from './index.js';

test('English is served as-is (reviewed by default)', () => {
  const result = getTemplates('en');
  assert.equal(result.language, 'en');
  assert.equal(result.fellBackToEnglish, false);
});

test('unreviewed languages fall back to English, not their own draft text', () => {
  for (const lang of ['ha', 'yo', 'ig', 'pcm'] as const) {
    const result = getTemplates(lang);
    assert.equal(result.language, 'en', `${lang} should fall back to English until reviewed`);
    assert.equal(result.fellBackToEnglish, true);
  }
});

test('render substitutes {variables} and leaves unknown ones untouched', () => {
  assert.equal(render('Alert for {community}!', { community: 'Lokoja' }), 'Alert for Lokoja!');
  assert.equal(render('Alert for {missing}!', {}), 'Alert for {missing}!');
});
