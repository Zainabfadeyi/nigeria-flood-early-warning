import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BaselinePercentiles } from './baseline.js';
import { highestRiskLevel, recommendedActionsForLevel, scoreWindow, type ScoringInputs } from './score.js';

const baseline: BaselinePercentiles = {
  riverPointId: 'test-point',
  p50: 100,
  p90: 200,
  p95: 250,
  p99: 300,
  sampleSize: 7300,
  historyStart: '2006-01-01',
  historyEnd: '2026-01-01',
  computedAt: '2026-01-01T00:00:00.000Z',
};

const baseInputs: ScoringInputs = {
  days: 7,
  glofas: null,
  outlook: 'NOT_LISTED',
  advisoryActive: false,
  heavyRainForecast: false,
  damReleaseActive: false,
};

test('no signals at all -> NONE risk, low confidence, explains itself', () => {
  const window = scoreWindow(baseInputs);
  assert.equal(window.riskLevel, 'NONE');
  assert.equal(window.confidence, 'low');
  assert.equal(window.reasons.length, 1);
  assert.match(window.reasons[0]!, /No elevated signals/);
});

test('discharge just above p90 -> LOW, with a reason and no peakDate escalation beyond what applies', () => {
  const window = scoreWindow({ ...baseInputs, glofas: { forecastMaxM3s: 210, baseline } });
  assert.equal(window.riskLevel, 'LOW');
  assert.equal(window.reasons.length, 1);
  assert.match(window.reasons[0]!, /90th-percentile/);
});

test('discharge above p95 -> MODERATE and records peakDate', () => {
  const window = scoreWindow({ ...baseInputs, glofas: { forecastMaxM3s: 260, peakDate: '2026-10-01', baseline } });
  assert.equal(window.riskLevel, 'MODERATE');
  assert.equal(window.peakDate, '2026-10-01');
  assert.match(window.reasons[0]!, /95th-percentile/);
});

test('discharge above p99 -> HIGH', () => {
  const window = scoreWindow({ ...baseInputs, glofas: { forecastMaxM3s: 310, baseline } });
  assert.equal(window.riskLevel, 'HIGH');
  assert.match(window.reasons[0]!, /99th-percentile/);
});

test('discharge below p90 contributes no reason or score', () => {
  const window = scoreWindow({ ...baseInputs, glofas: { forecastMaxM3s: 150, baseline } });
  assert.equal(window.riskLevel, 'NONE');
  assert.match(window.reasons[0]!, /No elevated signals/);
});

test('outlook HIGH alone -> LOW, with an explaining reason', () => {
  const window = scoreWindow({ ...baseInputs, outlook: 'HIGH' });
  assert.equal(window.riskLevel, 'LOW');
  assert.match(window.reasons[0]!, /high risk/);
});

test('multiple moderate signals stack to a higher level than any one alone', () => {
  // outlook MODERATE (+1) + advisory (+2) + heavy rain (+1) = 4 -> MODERATE
  const window = scoreWindow({ ...baseInputs, outlook: 'MODERATE', advisoryActive: true, heavyRainForecast: true });
  assert.equal(window.riskLevel, 'MODERATE');
  assert.equal(window.reasons.length, 3);
});

test('everything firing at once reaches SEVERE', () => {
  const window = scoreWindow({
    days: 30,
    glofas: { forecastMaxM3s: 310, baseline },
    outlook: 'HIGH',
    advisoryActive: true,
    heavyRainForecast: true,
    damReleaseActive: true,
  });
  assert.equal(window.riskLevel, 'SEVERE');
  assert.equal(window.reasons.length, 5);
});

test('confidence is low without GloFAS data even if other signals fire', () => {
  const window = scoreWindow({ ...baseInputs, outlook: 'HIGH', advisoryActive: true });
  assert.equal(window.confidence, 'low');
});

test('confidence is medium with GloFAS data but an unlisted outlook', () => {
  const window = scoreWindow({ ...baseInputs, glofas: { forecastMaxM3s: 150, baseline }, outlook: 'NOT_LISTED' });
  assert.equal(window.confidence, 'medium');
});

test('confidence is high with GloFAS data and a listed outlook', () => {
  const window = scoreWindow({ ...baseInputs, glofas: { forecastMaxM3s: 150, baseline }, outlook: 'LOW' });
  assert.equal(window.confidence, 'high');
});

test('confidence drops to low when ensemble spread is wide, regardless of outlook', () => {
  const window = scoreWindow({
    ...baseInputs,
    glofas: { forecastMaxM3s: 150, baseline, spreadRatio: 0.9 },
    outlook: 'HIGH',
  });
  assert.equal(window.confidence, 'low');
});

test('highestRiskLevel picks the worst of several windows', () => {
  const windows = [scoreWindow(baseInputs), scoreWindow({ ...baseInputs, outlook: 'HIGH', advisoryActive: true })];
  assert.equal(highestRiskLevel(windows), 'MODERATE');
});

test('every risk level has at least one recommended action', () => {
  for (const level of ['NONE', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'] as const) {
    assert.ok(recommendedActionsForLevel(level).length > 0, `${level} should have recommended actions`);
  }
});
