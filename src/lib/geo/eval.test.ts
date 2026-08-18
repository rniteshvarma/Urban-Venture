import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, computeMetrics, type ClassifiedCase } from './eval';
import type { ResolveResult } from './resolver';

const res = (status: ResolveResult['status'], lgdCode?: string): ResolveResult => ({
  status,
  lgdCode,
  confidence: status === 'RESOLVED' ? 0.97 : 0.5,
  method: 'FUZZY_HIGH',
});

test('classify: expected present', () => {
  assert.equal(classify(res('RESOLVED', 'V1'), 'V1'), 'correct');
  assert.equal(classify(res('RESOLVED', 'V2'), 'V1'), 'incorrect');
  assert.equal(classify(res('QUEUED'), 'V1'), 'unresolved');
  assert.equal(classify(res('NO_MATCH'), 'V1'), 'unresolved');
});

test('classify: no match expected (null)', () => {
  assert.equal(classify(res('QUEUED'), null), 'correct'); // true negative
  assert.equal(classify(res('NO_MATCH'), null), 'correct');
  assert.equal(classify(res('RESOLVED', 'V9'), null), 'incorrect'); // false positive
});

test('computeMetrics: precision, recall, f1', () => {
  // 8 positives: 6 correct, 1 wrong, 1 unresolved. 2 negatives: both correct.
  const cases: ClassifiedCase[] = [
    ...Array(6).fill({ cls: 'correct', expectedLgd: 'X' }),
    { cls: 'incorrect', expectedLgd: 'X' },
    { cls: 'unresolved', expectedLgd: 'X' },
    { cls: 'correct', expectedLgd: null },
    { cls: 'correct', expectedLgd: null },
  ];
  const m = computeMetrics(cases);
  assert.equal(m.total, 10);
  assert.equal(m.correct, 8);
  assert.equal(m.incorrect, 1);
  assert.equal(m.unresolved, 1);
  // precision = 8 / (8 + 1)
  assert.ok(Math.abs(m.precision - 8 / 9) < 1e-9);
  // recall = 6 correct positives / 8 positives
  assert.ok(Math.abs(m.recall - 6 / 8) < 1e-9);
  assert.ok(m.f1 > 0 && m.f1 < 1);
});

test('computeMetrics: empty set is vacuously perfect', () => {
  const m = computeMetrics([]);
  assert.equal(m.precision, 1);
  assert.equal(m.recall, 1);
});
