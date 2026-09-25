import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveByCoordinates, resolveByText } from './geo.js';

test('resolves an exact community name from free text', async () => {
  const match = await resolveByText('I live in Lokoja');
  assert.equal(match?.community.id, 'kogi-lokoja');
  assert.equal(match?.matchType, 'name');
});

test('falls back to LGA name when the community name is not mentioned', async () => {
  const match = await resolveByText('Makurdi town');
  assert.equal(match?.community.id, 'benue-makurdi');
});

test('unrecognised free text is outside MVP coverage', async () => {
  const match = await resolveByText('I am in Kano');
  assert.equal(match, null);
});

test('coordinates near a known community resolve to it', async () => {
  const match = await resolveByCoordinates(7.8, 6.74); // Lokoja
  assert.equal(match?.community.id, 'kogi-lokoja');
  assert.ok(match!.distanceKm < 5);
});

test('coordinates far from any MVP community are outside coverage', async () => {
  const match = await resolveByCoordinates(12.0, 8.52); // Kano
  assert.equal(match, null);
});

test('coordinates near Ikorodu resolve to it', async () => {
  const match = await resolveByCoordinates(6.6, 3.5); // Ikorodu
  assert.equal(match?.community.id, 'lagos-ikorodu');
});
