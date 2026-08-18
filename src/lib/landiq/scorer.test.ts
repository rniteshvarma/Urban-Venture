import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compositeScore, conviction, classifyEntryWindow, scoreUniverse, type PillarScores, type VillageInput } from './scorer';
import { profileForHorizon, profileByName, DEFAULT_PROFILE, WEIGHT_PROFILES } from './weight-profiles';

const P = (over: Partial<PillarScores> = {}): PillarScores => ({ IPP: 80, PMV: 80, TVL: 80, EEG: 80, DEV: 80, RZT: 80, DEM: 80, RSK: 100, ...over });

test('weight profiles: each horizon set sums to 1', () => {
  for (const p of WEIGHT_PROFILES) {
    const sum = Object.values(p.weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${p.name} weights sum ${sum}`);
  }
});

test('profileForHorizon maps years to band', () => {
  assert.equal(profileForHorizon(2).name, 'TRADER_1_3Y');
  assert.equal(profileForHorizon(4).name, 'BALANCED_3_5Y');
  assert.equal(profileForHorizon(7).name, 'BUILDER_5_10Y');
  assert.equal(profileForHorizon(20).name, 'LEGACY_10Y');
});

test('composite: RSK is a multiplier — severe risk collapses the score', () => {
  const clean = compositeScore(P({ RSK: 100 }), DEFAULT_PROFILE);
  assert.equal(clean, 80); // all pillars 80, weights sum to 1, multiplier 1
  const risky = compositeScore(P({ RSK: 25 }), DEFAULT_PROFILE);
  assert.equal(risky, 40); // × (0.25)^0.5 = 0.5
  const severe = compositeScore(P({ RSK: 16 }), DEFAULT_PROFILE);
  assert.equal(severe, 32); // × (0.16)^0.5 = 0.4
});

test('conviction: full data ~100, thin data < 40', () => {
  const strong = conviction({ coverage: 1, freshness: 1, sampleCount: 1000, pillarScores: [70, 70, 70, 70] });
  assert.ok(strong >= 98, `strong ${strong}`);
  const thin = conviction({ coverage: 0.25, freshness: 0.3, sampleCount: 0, pillarScores: [80, 20] });
  assert.ok(thin < 40, `thin ${thin}`);
});

test('entry window: AVOID / ACT_NOW / ACCUMULATE / FAIRLY_PRICED branches', () => {
  const base = { landIQScore: 70, rsk: 80, ippScore: 70, hasSevereRisk: false, cagr3y: 0.1, accel: 0.02, valueGap: 0.0, nearestCatalystYears: null as number | null, conviction: 70 };
  assert.equal(classifyEntryWindow({ ...base, rsk: 30 }), 'AVOID');
  assert.equal(classifyEntryWindow({ ...base, hasSevereRisk: true }), 'AVOID');
  assert.equal(classifyEntryWindow({ ...base, cagr3y: -0.01 }), 'AVOID');
  assert.equal(classifyEntryWindow({ ...base, conviction: 30 }), 'WATCH');
  assert.equal(classifyEntryWindow({ ...base, valueGap: 0.2, accel: 0.03, nearestCatalystYears: 1 }), 'ACT_NOW');
  assert.equal(classifyEntryWindow({ ...base, ippScore: 70, valueGap: 0 }), 'ACCUMULATE');
  assert.equal(classifyEntryWindow({ ...base, valueGap: -0.1, ippScore: 40 }), 'FAIRLY_PRICED');
});

test('scoreUniverse: cross-sectional IPP, RZT ceiling, risk collapse + AVOID', () => {
  const villages: VillageInput[] = [
    {
      villageId: 'high',
      exposures: [
        { status: 'COMPLETE', distanceKm: 2, impactRadiusKm: 10, yearsToCompletion: 0, reImpactScore: 9 },
        { status: 'UNDER_CONSTRUCTION', distanceKm: 5, impactRadiusKm: 15, yearsToCompletion: 2, reImpactScore: 8 },
      ],
      pmv: { priceNow: 20000, price1yAgo: 16000, price3yAgo: 12000, peerMedianPrice: 26000, circleRate: 8000, marketPrice: 20000 },
      rzt: { underHMDA: true, jurisdictionRecencyMonths: 6, masterPlanZone: 'Residential' },
      risks: [],
      sampleCount: 200, coverage: 0.5, freshness: 0.8,
    },
    {
      villageId: 'mid',
      exposures: [{ status: 'APPROVED', distanceKm: 8, impactRadiusKm: 12, yearsToCompletion: 4, reImpactScore: 6 }],
      pmv: { priceNow: 15000, price1yAgo: 14500, price3yAgo: 13000, peerMedianPrice: 15000, circleRate: 7000, marketPrice: 15000 },
      rzt: { underHMDA: false, masterPlanZone: 'Agricultural' },
      risks: [],
      sampleCount: 30,
    },
    {
      villageId: 'risky',
      exposures: [{ status: 'ANNOUNCED', distanceKm: 15, impactRadiusKm: 10, yearsToCompletion: 8, reImpactScore: 5 }],
      pmv: { priceNow: 26000, price1yAgo: 25000, price3yAgo: 24000, peerMedianPrice: 26000, circleRate: 9000, marketPrice: 26000 },
      rzt: { underHMDA: true, jurisdictionRecencyMonths: 2, masterPlanZone: 'Conservation', goEventsScore: 100 },
      risks: [{ flagType: 'SECTION_22A', severity: 'RED' }, { flagType: 'ACQUISITION_OVERLAP', severity: 'RED' }],
      sampleCount: 10,
    },
  ];

  const scored = scoreUniverse(villages, DEFAULT_PROFILE);
  const by = Object.fromEntries(scored.map((s) => [s.villageId, s]));

  // IPP normalised across the population: strongest exposure → 100, weakest → 0.
  assert.equal(by.high.pillars.IPP, 100);
  assert.equal(by.risky.pillars.IPP, 0);
  assert.ok(by.high.pillars.IPP > by.mid.pillars.IPP);

  // Conservation hard ceiling holds even with full jurisdiction + GO.
  assert.ok(by.risky.pillars.RZT <= 10, `risky RZT ${by.risky.pillars.RZT}`);

  // Two RED flags → severe risk → AVOID, and RSK multiplier drags the score down.
  assert.equal(by.risky.entryWindow, 'AVOID');
  assert.equal(by.high.pillars.RSK, 100);
  assert.ok(by.high.landIQScore > by.risky.landIQScore);
});
