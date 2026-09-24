import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RiskWindow } from '@nigeria-flood/shared';
import { decideAlertAction, worstWindow } from './alerts.js';

test('a genuine rise in risk level sends an alert', () => {
  assert.equal(decideAlertAction('NONE', undefined, 'MODERATE'), 'send-rise');
  assert.equal(decideAlertAction('LOW', undefined, 'HIGH'), 'send-rise');
});

test('an unchanged or lower risk level does not alert', () => {
  assert.equal(decideAlertAction('HIGH', undefined, 'HIGH'), 'skip');
  assert.equal(decideAlertAction('HIGH', undefined, 'MODERATE'), 'skip');
});

test('SEVERE persisting less than 48h does not re-alert', () => {
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  assert.equal(decideAlertAction('SEVERE', eightHoursAgo, 'SEVERE'), 'skip');
});

test('SEVERE persisting 48h or more sends exactly one reminder', () => {
  const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
  assert.equal(decideAlertAction('SEVERE', fortyNineHoursAgo, 'SEVERE'), 'send-reminder');
});

test('SEVERE persisting with no recorded lastAlertSentAt sends a reminder (fail toward alerting, not silence)', () => {
  assert.equal(decideAlertAction('SEVERE', undefined, 'SEVERE'), 'send-reminder');
});

test('dropping from SEVERE and rising back to SEVERE later counts as a genuine rise, not a reminder', () => {
  const recently = new Date().toISOString();
  assert.equal(decideAlertAction('MODERATE', recently, 'SEVERE'), 'send-rise');
});

test('worstWindow picks the higher-risk window regardless of order', () => {
  const windows: RiskWindow[] = [
    { days: 7, riskLevel: 'LOW', confidence: 'high', reasons: [] },
    { days: 30, riskLevel: 'SEVERE', confidence: 'high', reasons: [] },
  ];
  assert.equal(worstWindow(windows)?.days, 30);
  assert.equal(worstWindow([...windows].reverse())?.days, 30);
});

test('worstWindow returns null for an empty list', () => {
  assert.equal(worstWindow([]), null);
});
