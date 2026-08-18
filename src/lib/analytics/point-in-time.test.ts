/**
 * Lookahead-bias guard test (Validation Lab acceptance criterion):
 * "No backtest can read a feature with knownAt > asOfDate — enforced by test."
 *
 * DB-backed, self-cleaning. Run with:  npm run test:analytics
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma';
import { getFeaturesAsOf, getFeatureAsOf } from './point-in-time';

const P = 'PIT_TEST_';
let villageId = '';

const D = (iso: string) => new Date(iso + 'T00:00:00Z');

before(async () => {
  if (villageId) return; // idempotent: hook may fire more than once
  const state = await prisma.state.upsert({
    where: { lgdCode: P + 'S1' }, update: {}, create: { code: P + 'S', name: 'PitState', lgdCode: P + 'S1' },
  });
  const dist = await prisma.district.upsert({
    where: { lgdCode: P + 'D1' }, update: {}, create: { stateId: state.id, name: 'PitDist', lgdCode: P + 'D1' },
  });
  const mandal = await prisma.mandal.upsert({
    where: { lgdCode: P + 'M1' }, update: {}, create: { districtId: dist.id, name: 'PitMandal', lgdCode: P + 'M1' },
  });
  const v = await prisma.revenueVillage.upsert({
    where: { lgdCode: P + 'V1' }, update: {},
    create: { mandalId: mandal.id, name: 'PitVillage', lgdCode: P + 'V1', nameNormalised: 'pitvillage', namePhonetic: 'PTFLJ' },
  });
  villageId = v.id;

  await prisma.villageFeature.deleteMany({ where: { source: P } });
  await prisma.villageFeature.createMany({
    data: [
      // ndbi history — known when observed
      { villageId, featureKey: 'ndbi', observedAt: D('2020-01-01'), knownAt: D('2020-01-01'), value: 0.5, source: P },
      { villageId, featureKey: 'ndbi', observedAt: D('2022-01-01'), knownAt: D('2022-01-01'), value: 0.8, source: P },
      // observed far in the future but back-dated as known in 2021 — must not appear until its observedAt has passed
      { villageId, featureKey: 'ndbi', observedAt: D('2025-01-01'), knownAt: D('2021-01-01'), value: 1.5, source: P },
      // THE TRAP: true in the past (2019) but only LEARNED in 2025. Must never leak into a pre-2025 view.
      { villageId, featureKey: 'future_leak', observedAt: D('2019-01-01'), knownAt: D('2025-01-01'), value: 999, source: P },
    ],
  });
});

after(async () => {
  await prisma.villageFeature.deleteMany({ where: { source: P } });
  await prisma.revenueVillage.deleteMany({ where: { lgdCode: { startsWith: P } } });
  await prisma.mandal.deleteMany({ where: { lgdCode: { startsWith: P } } });
  await prisma.district.deleteMany({ where: { lgdCode: { startsWith: P } } });
  await prisma.state.deleteMany({ where: { lgdCode: { startsWith: P } } });
  await prisma.$disconnect();
});

test('as of 2021: only past-and-known features; future-known leak excluded', async () => {
  const m = await getFeaturesAsOf([villageId], D('2021-06-30'));
  const f = m.get(villageId)!;
  // ndbi: 2020 qualifies; 2022 not yet observed/known; 2025-observed not yet true.
  assert.equal(f.get('ndbi')?.value, 0.5);
  // The core guarantee: a feature learned in 2025 must NOT appear in a 2021 view.
  assert.equal(f.has('future_leak'), false);
});

test('as of 2023: ndbi advances to the 2022 observation', async () => {
  const f = (await getFeaturesAsOf([villageId], D('2023-06-30'))).get(villageId)!;
  assert.equal(f.get('ndbi')?.value, 0.8);
  assert.equal(f.has('future_leak'), false); // still learned only in 2025
});

test('as of 2026: latest-observed wins, and the once-hidden fact is now visible', async () => {
  const f = (await getFeaturesAsOf([villageId], D('2026-06-30'))).get(villageId)!;
  assert.equal(f.get('ndbi')?.value, 1.5); // 2025 observed is now the latest
  assert.equal(f.get('future_leak')?.value, 999); // knownAt 2025 <= asOf
});

test('getFeatureAsOf: single-feature convenience matches matrix', async () => {
  const leakBefore = await getFeatureAsOf(villageId, 'future_leak', D('2024-01-01'));
  assert.equal(leakBefore, null); // not yet known in 2024
  const leakAfter = await getFeatureAsOf(villageId, 'future_leak', D('2026-01-01'));
  assert.equal(leakAfter?.value, 999);
});
