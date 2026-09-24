import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Community } from '@nigeria-flood/shared';
import type { LlmProvider } from '../llm/types.js';
import { extractOutlookFromText } from './parsePdf.js';

const communities: Community[] = [
  { id: 'kogi-lokoja', name: 'Lokoja', lga: 'Lokoja', state: 'Kogi', latitude: 7.8, longitude: 6.74, riverPointIds: [] },
];

function fakeProvider(response: unknown): LlmProvider {
  return {
    name: 'fake',
    async extractJson() {
      return { data: response, raw: JSON.stringify(response), warnings: [] };
    },
  };
}

test('valid extraction splits high- and low-confidence rows', async () => {
  const result = await extractOutlookFromText(
    'irrelevant document text',
    communities,
    fakeProvider([
      { communityId: 'kogi-lokoja', category: 'HIGH', confidence: 'high', quote: 'Lokoja is classified high risk.' },
      { communityId: 'kogi-ajaokuta', category: 'MODERATE', confidence: 'low', quote: 'possibly Ajaokuta' },
    ]),
  );
  assert.ok(result.data);
  assert.equal(result.data!.rows.length, 1);
  assert.equal(result.data!.rows[0]!.communityId, 'kogi-lokoja');
  assert.equal(result.data!.lowConfidenceRows.length, 1);
  assert.equal(result.data!.lowConfidenceRows[0]!.communityId, 'kogi-ajaokuta');
});

test('schema-invalid LLM output is rejected, not silently accepted', async () => {
  const result = await extractOutlookFromText('text', communities, fakeProvider([{ communityId: 'kogi-lokoja', category: 'EXTREME', confidence: 'high', quote: 'x' }]));
  assert.equal(result.data, null);
  assert.match(result.warnings[0]!, /schema validation/);
});

test('non-JSON / null LLM response is treated as unavailable, not an error', async () => {
  const result = await extractOutlookFromText('text', communities, fakeProvider(null));
  assert.equal(result.data, null);
});

test('no LLM provider configured short-circuits with a clear warning', async () => {
  const noop: LlmProvider = {
    name: 'none',
    async extractJson() {
      return { data: null, raw: '', warnings: ['no key'] };
    },
  };
  const result = await extractOutlookFromText('text', communities, noop);
  assert.equal(result.data, null);
  assert.match(result.warnings[0]!, /No LLM provider configured/);
});
