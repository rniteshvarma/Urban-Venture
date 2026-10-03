/**
 * Recompute every corridor's market numbers (prices from our listings,
 * scenario forecast, scores, RERA approval records). Runs in the Vercel
 * build after the inventory seed, so production always matches the catalog.
 *
 *   npm run market:recompute
 *
 * Also removes the synthetic rows the original seed shipped (a made-up price
 * history, demand trends, approval records with invented numbers, and a
 * city "pulse" row). They were all inserted in one batch on 2026-08-16, so
 * this only ever matches that batch — rows added later are untouched.
 */
import prisma from "../../src/lib/prisma";
import { computeAllCorridorScores } from "../../src/lib/corridor-intelligence";

const SYNTHETIC_SEED_BATCH = { gte: new Date("2026-08-16T04:38:00Z"), lt: new Date("2026-08-16T04:39:00Z") };

async function main() {
  const where = { createdAt: SYNTHETIC_SEED_BATCH };
  const removed = {
    appreciationHistory: (await prisma.appreciationHistory.deleteMany({ where })).count,
    demandTrend: (await prisma.demandTrend.deleteMany({ where })).count,
    approvalRecord: (await prisma.approvalRecord.deleteMany({ where })).count,
    marketPulse: (await prisma.marketPulse.deleteMany({ where })).count,
  };
  if (Object.values(removed).some((n) => n > 0)) console.log("[market] removed synthetic seed rows:", removed);

  const results = await computeAllCorridorScores({ skipAI: true });
  const rows = await prisma.corridorProfile.findMany({
    select: { slug: true, overallScore: true, plotPriceMidSqYd: true, aptPriceMinSqFt: true, aptPriceMaxSqFt: true, projectedCAGRMin: true, projectedCAGRMax: true, priceIndex2031: true, marketStats: true },
    orderBy: { overallScore: "desc" },
  });
  console.log(`[market] recomputed ${results.length} corridors`);
  for (const r of rows) {
    const m = r.marketStats as { primaryAsset: string; rates: Record<string, { projects: number; confidence: string; radiusKm: number }>; forecast: Record<string, { scenarios: Record<string, { cagr5: number; cagr10: number; index: number[] }> }> } | null;
    const f = m?.forecast[m.primaryAsset]?.scenarios;
    const pr = m?.rates.plot, ar = m?.rates.apartment;
    console.log(
      `  ${r.slug.padEnd(24)} score ${String(r.overallScore).padStart(3)} | plot ${r.plotPriceMidSqYd ?? "—"}${pr ? ` (${pr.projects}p ${pr.confidence} ${pr.radiusKm}km)` : ""} | apt ${r.aptPriceMinSqFt ?? "—"}–${r.aptPriceMaxSqFt ?? "—"}${ar ? ` (${ar.projects}p)` : ""} | ${m?.primaryAsset} base ${f?.base.cagr10}%/yr, 10y index ${f?.conservative.index[10]}/${f?.base.index[10]}/${f?.optimistic.index[10]}`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
