import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Community } from '@nigeria-flood/shared';
import { resolveLocation } from './resolveLocation.js';

const communities: Community[] = [
  { id: 'kogi-lokoja', name: 'Lokoja', lga: 'Lokoja', state: 'Kogi', latitude: 7.8, longitude: 6.74, riverPointIds: ['p1'] },
  { id: 'benue-makurdi', name: 'Makurdi', lga: 'Makurdi', state: 'Benue', latitude: 7.7322, longitude: 8.5391, riverPointIds: ['p2'] },
];

test('resolves an exact community name match', () => {
  const match = resolveLocation({ community: 'Lokoja' }, communities);
  assert.equal(match.community?.id, 'kogi-lokoja');
  assert.equal(match.resolved.latitude, 7.8);
});

test('name matching is case-insensitive', () => {
  const match = resolveLocation({ community: 'lokoja' }, communities);
  assert.equal(match.community?.id, 'kogi-lokoja');
});

test('falls back to LGA when the community name is unrecognised', () => {
  const match = resolveLocation({ community: 'Some village', lga: 'Makurdi' }, communities);
  assert.equal(match.community?.id, 'benue-makurdi');
});

test('unrecognised name with no LGA/state match is outside MVP coverage', () => {
  const match = resolveLocation({ community: 'Nowhereville' }, communities);
  assert.equal(match.community, null);
  assert.equal(match.resolved.latitude, undefined);
});

test('coordinates within range snap to the nearest community', () => {
  const match = resolveLocation({ latitude: 7.81, longitude: 6.75 }, communities);
  assert.equal(match.community?.id, 'kogi-lokoja');
});

test('coordinates far from any community are outside MVP coverage', () => {
  const match = resolveLocation({ latitude: 6.5244, longitude: 3.3792 }, communities); // Lagos
  assert.equal(match.community, null);
});
