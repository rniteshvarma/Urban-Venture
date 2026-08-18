/**
 * Resolver accuracy harness (AGENTS.md geo spec, Part 5).
 *
 *   npm run eval:resolver
 *
 * Runs resolveVillage() over every GoldenTestCase with the alias cache DISABLED
 * (otherwise you'd be testing the cache, not the resolver) and persistence OFF
 * (the eval must not write aliases or queue rows). Computes precision / recall /
 * F1, stores a ResolverEvalRun, and GATES: exits non-zero if precision < 0.95 or
 * falls more than 2 points below the previous run. Wrong matches are worse than
 * missing ones, so precision is the guarded metric.
 */

import prisma from '../../src/lib/prisma';
import { resolveVillage, RESOLVER_VERSION } from '../../src/lib/geo/resolver';
import { classify, computeMetrics, type ClassifiedCase } from '../../src/lib/geo/eval';

const PRECISION_GATE = 0.95;
const MAX_REGRESSION = 0.02;

async function main() {
  const cases = await prisma.goldenTestCase.findMany();
  if (cases.length === 0) {
    console.error('No GoldenTestCase rows. Seed the golden set first (npm run golden:import -- --file=...).');
    process.exit(1);
  }

  console.log(`\n▶ Evaluating resolver ${RESOLVER_VERSION} over ${cases.length} golden cases (alias cache OFF)\n`);

  const classified: ClassifiedCase[] = [];
  const failures: Array<Record<string, unknown>> = [];

  for (const c of cases) {
    const result = await resolveVillage(
      { source: c.source, rawName: c.rawName, rawDistrict: c.rawDistrict, rawMandal: c.rawMandal },
      { useAliasCache: false, persist: false },
    );
    const cls = classify(result, c.expectedLgd);
    classified.push({ cls, expectedLgd: c.expectedLgd });

    if (cls !== 'correct') {
      failures.push({
        source: c.source,
        rawName: c.rawName,
        rawDistrict: c.rawDistrict,
        rawMandal: c.rawMandal,
        expectedLgd: c.expectedLgd,
        got: result.status === 'RESOLVED' ? result.lgdCode : result.status,
        class: cls,
        topCandidates: (result.candidates ?? []).slice(0, 3).map((k) => `${k.name}/${k.lgdCode}=${k.score.toFixed(3)}`),
      });
    }
  }

  const m = computeMetrics(classified);

  const prev = await prisma.resolverEvalRun.findFirst({ orderBy: { runAt: 'desc' } });

  await prisma.resolverEvalRun.create({
    data: {
      resolverVersion: RESOLVER_VERSION,
      totalCases: m.total,
      correct: m.correct,
      incorrect: m.incorrect,
      unresolved: m.unresolved,
      precision: m.precision,
      recall: m.recall,
      f1: m.f1,
      failureDetail: failures as unknown as object,
    },
  });

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log('  ─────────────────────────────────────────');
  console.log(`  cases        ${m.total}`);
  console.log(`  correct      ${m.correct}`);
  console.log(`  incorrect    ${m.incorrect}   ← the metric that matters`);
  console.log(`  unresolved   ${m.unresolved}`);
  console.log(`  precision    ${(m.precision * 100).toFixed(2)}%   (gate ≥ ${(PRECISION_GATE * 100).toFixed(0)}%)`);
  console.log(`  recall       ${(m.recall * 100).toFixed(2)}%`);
  console.log(`  f1           ${(m.f1 * 100).toFixed(2)}%`);
  if (prev) console.log(`  prev precision ${(prev.precision * 100).toFixed(2)}%`);
  console.log('  ─────────────────────────────────────────\n');

  if (failures.length) {
    console.log(`  ${failures.length} non-correct case(s):`);
    for (const f of failures.slice(0, 40)) {
      console.log(`   • [${f.class}] "${f.rawName}" (${f.rawMandal ?? '-'}, ${f.rawDistrict ?? '-'}) expected=${f.expectedLgd ?? 'NONE'} got=${f.got}`);
      if ((f.topCandidates as string[]).length) console.log(`       candidates: ${(f.topCandidates as string[]).join(', ')}`);
    }
    console.log('');
  }

  // ── Gate ────────────────────────────────────────────────────────────────────
  let failed = false;
  if (m.precision < PRECISION_GATE) {
    console.error(`✖ GATE FAILED: precision ${(m.precision * 100).toFixed(2)}% < ${(PRECISION_GATE * 100).toFixed(0)}%`);
    failed = true;
  }
  if (prev && m.precision < prev.precision - MAX_REGRESSION) {
    console.error(`✖ GATE FAILED: precision regressed ${((prev.precision - m.precision) * 100).toFixed(2)}pts (> ${MAX_REGRESSION * 100}pt budget)`);
    failed = true;
  }

  await prisma.$disconnect();
  if (failed) process.exit(1);
  console.log('✓ Resolver eval passed the gate.\n');
}

main().catch(async (e) => {
  console.error('\n✖ eval failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
