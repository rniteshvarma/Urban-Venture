/**
 * Import OpenStreetMap places for the Hyderabad region and score every
 * listing's accessibility, then print a coverage report.
 *
 *   npm run osm:sync                  # full import + rescore everything
 *   npm run osm:sync -- --scores-only # rescore new / edited / stale listings only
 *   npm run osm:sync -- --only=orr_exit,mall  # re-import just these categories
 */
import prisma from "../../src/lib/prisma";
import { recomputeAccessibility, syncOsm } from "../../src/lib/osm/sync";
import { OSM_CATEGORY_KEYS, type OsmCategory } from "../../src/lib/osm/categories";

async function report() {
  const rows = await prisma.projectAccessibility.findMany({
    select: { score: true, confidence: true, watchOuts: true, project: { select: { corridor: true, status: true } } },
  });
  const live = rows.filter((r) => r.project.status === "ACTIVE");
  if (!live.length) return console.log("No scored live listings.");
  const bands = [0, 40, 55, 70, 85, 101];
  console.log("\nScore distribution (live listings):");
  for (let i = 0; i < bands.length - 1; i++) {
    const n = live.filter((r) => r.score >= bands[i] && r.score < bands[i + 1]).length;
    console.log(`  ${String(bands[i]).padStart(3)}–${String(Math.min(bands[i + 1] - 1, 100)).padEnd(3)} ${"█".repeat(Math.round((n / live.length) * 60))} ${n}`);
  }
  const conf = live.reduce<Record<string, number>>((m, r) => ((m[r.confidence] = (m[r.confidence] ?? 0) + 1), m), {});
  console.log("Confidence:", conf);
  const byArea = new Map<string, number[]>();
  for (const r of live) byArea.set(r.project.corridor, [...(byArea.get(r.project.corridor) ?? []), r.score]);
  console.log("\nAverage by area:");
  for (const [area, s] of [...byArea].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(Math.round(s.reduce((a, b) => a + b, 0) / s.length)).padStart(3)}  ${area} (${s.length})`);
  }
  const warn = live.flatMap((r) => (r.watchOuts as { key: string }[]).map((w) => w.key));
  console.log("\nWarnings:", warn.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {}));
}

async function main() {
  const scoresOnly = process.argv.includes("--scores-only");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean) as OsmCategory[] | undefined;
  const unknown = only?.filter((c) => !OSM_CATEGORY_KEYS.includes(c));
  if (unknown?.length) throw new Error(`Unknown categories: ${unknown.join(", ")} (known: ${OSM_CATEGORY_KEYS.join(", ")})`);
  if (!scoresOnly) {
    const s = await syncOsm({ categories: only, log: console.log });
    console.log(`Import ${s.status}:`, s.counts, Object.keys(s.errors).length ? s.errors : "");
  }
  await recomputeAccessibility({ onlyStale: scoresOnly, log: console.log });
  await report();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
