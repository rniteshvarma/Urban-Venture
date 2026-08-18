/**
 * Seed the default horizon weight profiles into ScoringWeightProfile so they are
 * tunable in admin without a deploy (LANDIQ spec, Part 3.2). Idempotent.
 *
 *   npm run landiq:seed-weights
 */

import prisma from '../../src/lib/prisma';
import { WEIGHT_PROFILES } from '../../src/lib/landiq/weight-profiles';

async function main() {
  for (const p of WEIGHT_PROFILES) {
    await prisma.scoringWeightProfile.upsert({
      where: { name: p.name },
      update: {
        label: p.label,
        horizonYearsMin: p.horizonYearsMin,
        horizonYearsMax: p.horizonYearsMax,
        wIPP: p.weights.IPP, wPMV: p.weights.PMV, wTVL: p.weights.TVL, wEEG: p.weights.EEG,
        wDEV: p.weights.DEV, wRZT: p.weights.RZT, wDEM: p.weights.DEM,
        rskExponent: p.rskExponent,
      },
      create: {
        name: p.name,
        label: p.label,
        horizonYearsMin: p.horizonYearsMin,
        horizonYearsMax: p.horizonYearsMax,
        wIPP: p.weights.IPP, wPMV: p.weights.PMV, wTVL: p.weights.TVL, wEEG: p.weights.EEG,
        wDEV: p.weights.DEV, wRZT: p.weights.RZT, wDEM: p.weights.DEM,
        rskExponent: p.rskExponent,
      },
    });
    console.log(`  ✓ ${p.name}  (${p.label})`);
  }
  const count = await prisma.scoringWeightProfile.count();
  console.log(`\n✓ ${count} weight profiles in DB.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✖ seed-weight-profiles failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
