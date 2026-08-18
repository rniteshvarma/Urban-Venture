import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ippContribution,
  ippRaw,
  cagr,
  computePmvSignals,
  masterPlanScore,
  rztScore,
  rskScore,
} from './pillars';

test('IPP: ANNOUNCED-far-10yr scores far below UNDER_CONSTRUCTION-near-2yr', () => {
  const hype = ippContribution({ status: 'ANNOUNCED', distanceKm: 10, impactRadiusKm: 10, yearsToCompletion: 10, reImpactScore: 9 });
  const real = ippContribution({ status: 'UNDER_CONSTRUCTION', distanceKm: 2, impactRadiusKm: 10, yearsToCompletion: 2, reImpactScore: 8 });
  assert.ok(real > hype * 3, `real ${real.toFixed(3)} should dwarf hype ${hype.toFixed(3)}`);
});

test('IPP: CANCELLED contributes nothing; raw is bounded in [0,1)', () => {
  assert.equal(ippContribution({ status: 'CANCELLED', distanceKm: 1, impactRadiusKm: 10, yearsToCompletion: 0, reImpactScore: 10 }), 0);
  const raw = ippRaw(Array(20).fill({ status: 'COMPLETE', distanceKm: 0, impactRadiusKm: 10, yearsToCompletion: 0, reImpactScore: 10 }));
  assert.ok(raw > 0.9 && raw < 1, `raw ${raw}`);
});

test('IPP: more/closer exposure raises raw', () => {
  const one = ippRaw([{ status: 'COMPLETE', distanceKm: 5, impactRadiusKm: 10, yearsToCompletion: 0, reImpactScore: 7 }]);
  const two = ippRaw([
    { status: 'COMPLETE', distanceKm: 5, impactRadiusKm: 10, yearsToCompletion: 0, reImpactScore: 7 },
    { status: 'COMPLETE', distanceKm: 1, impactRadiusKm: 10, yearsToCompletion: 0, reImpactScore: 9 },
  ]);
  assert.ok(two > one);
});

test('cagr: 12000 -> ~20000 over 3y ≈ 18.6%', () => {
  assert.ok(Math.abs(cagr(20000, 12000, 3) - 0.1856) < 0.002);
  assert.equal(cagr(100, 0, 3), 0); // guard zero base
});

test('PMV signals: value gap and acceleration', () => {
  const s = computePmvSignals({ priceNow: 20000, price1yAgo: 16000, price3yAgo: 12000, peerMedianPrice: 26000, circleRate: 8000, marketPrice: 20000 });
  assert.ok(s.valueGap > 0.2, 'cheaper than peers'); // (26000-20000)/26000
  assert.ok(s.accel > 0, 'growth accelerating'); // cagr1y(0.25) > cagr3y(~0.186)
  assert.ok(Math.abs(s.circleSpread - 1.5) < 0.01);
});

test('masterPlanScore: zone table + hard-ceiling values', () => {
  assert.equal(masterPlanScore('Residential R1'), 100);
  assert.equal(masterPlanScore('Green/Conservation'), 10);
  assert.equal(masterPlanScore('Water body / FTL'), 0);
  assert.equal(masterPlanScore('Agricultural'), 55);
  assert.equal(masterPlanScore(null), 60);
});

test('RZT: Conservation is a HARD CEILING — full jurisdiction+GO cannot rescue it', () => {
  const capped = rztScore({ underHMDA: true, underGHMC: true, jurisdictionRecencyMonths: 3, masterPlanZone: 'Conservation', goEventsScore: 100 });
  assert.ok(capped <= 10, `conservation RZT ${capped} must be <= 10`);
  const residential = rztScore({ underHMDA: true, jurisdictionRecencyMonths: 3, masterPlanZone: 'Residential', goEventsScore: 60 });
  assert.ok(residential >= 70, `residential RZT ${residential} should be strong`);
});

test('RSK: penalties subtract from 100, floored at 0, unknown flag uses severity', () => {
  assert.equal(rskScore([{ flagType: 'SECTION_22A' }]), 75);
  assert.equal(rskScore([{ flagType: 'SECTION_22A' }, { flagType: 'ACQUISITION_OVERLAP' }, { flagType: 'GO_111' }]), 40);
  assert.equal(rskScore(Array(10).fill({ flagType: 'SECTION_22A' })), 0); // floored
  assert.equal(rskScore([{ flagType: 'UNKNOWN_THING', severity: 'RED' }]), 80); // severity fallback
  assert.equal(rskScore([]), 100);
});
