import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computePercentiles } from './baseline.js';

test('computePercentiles handles an already-sorted small sample', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = computePercentiles('p', values, '2006-01-01', '2026-01-01');
  assert.equal(result.p50, 5.5);
  assert.equal(result.p90, 9.1);
  assert.equal(result.sampleSize, 10);
});

test('computePercentiles does not depend on input order', () => {
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = [7, 2, 9, 4, 1, 10, 3, 8, 5, 6];
  const a = computePercentiles('a', sorted, '2006-01-01', '2026-01-01');
  const b = computePercentiles('b', shuffled, '2006-01-01', '2026-01-01');
  assert.equal(a.p50, b.p50);
  assert.equal(a.p90, b.p90);
  assert.equal(a.p95, b.p95);
  assert.equal(a.p99, b.p99);
});

test('computePercentiles handles a single value', () => {
  const result = computePercentiles('p', [42], '2006-01-01', '2026-01-01');
  assert.equal(result.p50, 42);
  assert.equal(result.p99, 42);
  assert.equal(result.sampleSize, 1);
});

test('computePercentiles on an all-zero series (a dry/off-channel point) is all zero, not NaN', () => {
  const result = computePercentiles('p', new Array(100).fill(0), '2006-01-01', '2026-01-01');
  assert.equal(result.p50, 0);
  assert.equal(result.p99, 0);
});

test('percentiles are non-decreasing', () => {
  const values = Array.from({ length: 1000 }, () => Math.random() * 1000);
  const result = computePercentiles('p', values, '2006-01-01', '2026-01-01');
  assert.ok(result.p50 <= result.p90);
  assert.ok(result.p90 <= result.p95);
  assert.ok(result.p95 <= result.p99);
});
