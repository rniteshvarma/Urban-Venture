/**
 * Unit tests for lib/geo/normalise.ts. Run with:  npm run test:geo
 * Uses node:test (built-in) via tsx — no test-runner dependency.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalise,
  normaliseVillageName,
  phoneticKey,
  transliterateKey,
} from './normalise';

test('basic clean: lowercase, trim, collapse whitespace', () => {
  assert.equal(normaliseVillageName('  KADTHAL  '), 'kadtal');
  assert.equal(normaliseVillageName('Ranga   Reddy'), 'ranga reddy');
});

test('admin parenthetical markers are dropped', () => {
  assert.equal(normaliseVillageName('Kadthal (V)'), 'kadtal');
  assert.equal(normaliseVillageName('Shadnagar (M)'), 'sadnagar');
  assert.equal(normaliseVillageName('Something (CT)'), 'someting');
  assert.equal(normaliseVillageName('Foo (OG)'), 'fu');
});

test('non-admin parenthetical is kept as qualifier, not in canonical', () => {
  const a = normalise('Rampur (Kothur)');
  const b = normalise('Rampur (Shadnagar)');
  assert.equal(a.canonical, b.canonical, 'same base name');
  assert.equal(a.qualifier, 'kotur');
  assert.equal(b.qualifier, 'sadnagar');
  assert.equal(a.canonical, 'rampur');
});

test('admin words stripped anywhere', () => {
  assert.equal(normaliseVillageName('Kadthal Revenue Village'), 'kadtal');
  assert.equal(normaliseVillageName('Kadthal Village'), 'kadtal');
  assert.equal(normaliseVillageName('Gram Kadthal'), 'kadtal');
});

test('diacritics and punctuation removed', () => {
  assert.equal(normaliseVillageName('Rámpúr'), 'rampur');
  assert.equal(normaliseVillageName('Rampur-Khurd'), 'rampur kurd');
  assert.equal(normaliseVillageName("K'adthal."), 'kadtal');
});

test('substitution rules: aspirated consonants', () => {
  // th->t dh->d bh->b gh->g kh->k ph->f sh->s
  assert.equal(normaliseVillageName('thth'), 'tt');
  assert.equal(normaliseVillageName('Bhongir'), 'bongir');
  assert.equal(normaliseVillageName('Ghatkesar'), 'gatkesar');
  assert.equal(normaliseVillageName('Khammam'), 'kammam'); // kh->k; geminate mm preserved
  assert.equal(normaliseVillageName('Sheriguda'), 'serigud'); // sh->s, trailing 'a' dropped
});

test('substitution rules: ksh before sh/kh', () => {
  // 'ksh' -> 'ks' must fire before 'sh'->'s' / 'kh'->'k'
  assert.equal(normaliseVillageName('Lakshmipur'), 'laksmipur');
});

test('substitution rules: doubled vowels and ai', () => {
  assert.equal(normaliseVillageName('Boodhan'), 'budan'); // oo->u, dh->d
  assert.equal(normaliseVillageName('Meerpet'), 'mirpet'); // ee->i
  assert.equal(normaliseVillageName('Maisaram'), 'maysaram'); // ai->ay
});

test('substitution rules: w->v, z->j', () => {
  assert.equal(normaliseVillageName('Wadala'), 'vadal'); // w->v, trailing a dropped
  assert.equal(normaliseVillageName('Zaheerabad'), 'jahirabad'); // z->j, ee->i
});

test('suffix equivalence classes collapse to canonical', () => {
  // palli ~ pally ~ palle
  const base = normaliseVillageName('Gollapalli');
  assert.equal(normaliseVillageName('Gollapally'), base);
  assert.equal(normaliseVillageName('Gollapalle'), base);
  assert.equal(base, 'gollapalli');
  // gudem ~ guda
  assert.equal(normaliseVillageName('Tukkugudem'), normaliseVillageName('Tukkuguda'));
  // puram ~ pur
  assert.equal(normaliseVillageName('Rampuram'), normaliseVillageName('Rampur'));
  // wada ~ vada (w->v then vada canonical)
  assert.equal(normaliseVillageName('Wada'), normaliseVillageName('Vada'));
  // cherla ~ charla
  assert.equal(normaliseVillageName('Mancherla'), normaliseVillageName('Mancharla'));
  // konda ~ kunda
  assert.equal(normaliseVillageName('Nakonda'), normaliseVillageName('Nakunda'));
});

test('trailing-a: canonical drops it, canonicalWithA keeps it', () => {
  const n = normalise('Adibatla');
  assert.equal(n.canonicalWithA, 'adibatla');
  assert.equal(n.canonical, 'adibatl');
  // single-letter stem must not be emptied
  assert.equal(normalise('A').canonical, 'a');
});

test('phoneticKey: same key for spelling variants', () => {
  const k1 = phoneticKey(normaliseVillageName('Kadthal'));
  const k2 = phoneticKey(normaliseVillageName('Kadtal'));
  assert.equal(k1, k2);
  assert.ok(k1.length > 0);
});

test('transliterateKey: Telugu matches English spelling', () => {
  // కడ్తల్ ~ "Kadthal"
  const teluguKey = transliterateKey('కడ్తల్');
  const englishKey = phoneticKey(normaliseVillageName('Kadthal'));
  assert.ok(teluguKey.length > 0, 'telugu key non-empty');
  assert.equal(teluguKey, englishKey);
});

test('empty / whitespace inputs are safe', () => {
  assert.equal(normaliseVillageName(''), '');
  assert.equal(normaliseVillageName('   '), '');
  assert.equal(phoneticKey(''), '');
  assert.equal(transliterateKey(''), '');
  assert.equal(transliterateKey('   '), '');
});
