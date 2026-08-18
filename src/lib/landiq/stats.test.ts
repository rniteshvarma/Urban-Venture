import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, zScore, median, normalise0to100, zTo100, clamp } from './stats';

test('computeStats + zScore', () => {
  const s = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(s.mean, 5);
  assert.equal(s.std, 2);
  assert.equal(zScore(7, s), 1);
  assert.equal(zScore(5, computeStats([5, 5, 5])), 0); // no spread → 0, no divide-by-zero
});

test('median: odd and even', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), 0);
});

test('normalise0to100 + clamp + zTo100', () => {
  assert.equal(normalise0to100(5, 0, 10), 50);
  assert.equal(normalise0to100(5, 5, 5), 50); // no spread → neutral
  assert.equal(normalise0to100(20, 0, 10), 100); // clamped
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(Math.round(zTo100(0)), 50);
  assert.ok(zTo100(2) > 80 && zTo100(-2) < 20);
});
