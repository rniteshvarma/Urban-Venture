import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaro, jaroWinkler, tokenSetRatio } from './similarity';

const approx = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

test('jaro: identical and disjoint', () => {
  assert.equal(jaro('kadthal', 'kadthal'), 1);
  assert.equal(jaro('abc', 'xyz'), 0);
  assert.equal(jaro('', ''), 0);
  assert.equal(jaro('a', ''), 0);
});

test('jaro: known reference values', () => {
  // Classic Winkler examples
  assert.ok(approx(jaro('MARTHA', 'MARHTA'), 0.944));
  assert.ok(approx(jaro('DWAYNE', 'DUANE'), 0.822));
});

test('jaroWinkler: prefix boost raises score above jaro', () => {
  assert.ok(approx(jaroWinkler('MARTHA', 'MARHTA'), 0.961));
  assert.ok(jaroWinkler('kadthal', 'kadtal') > jaro('kadthal', 'kadtal'));
  assert.equal(jaroWinkler('kadthal', 'kadthal'), 1);
});

test('tokenSetRatio: single token reduces to jaroWinkler', () => {
  assert.ok(approx(tokenSetRatio('kadthal', 'kadtal'), jaroWinkler('kadthal', 'kadtal')));
});

test('tokenSetRatio: word order and subset', () => {
  assert.equal(tokenSetRatio('ranga reddy', 'reddy ranga'), 1);
  // Shared core "kadthal" scores high despite extra token
  assert.ok(tokenSetRatio('kadthal', 'kadthal khurd') > 0.9);
  assert.equal(tokenSetRatio('', 'x'), 0);
});
