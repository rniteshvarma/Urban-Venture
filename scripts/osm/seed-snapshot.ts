/**
 * Build step: makes sure every listing with a map pin has an accessibility
 * score, without calling the public Overpass servers (too unreliable to sit
 * in a deploy).
 *
 * 1. Any OpenStreetMap category with no rows is filled from
 *    prisma/data/osm-snapshot.json.gz (written by export-snapshot.ts).
 *    Categories that already have rows — e.g. refreshed by the daily
 *    osm-sync cron — are never touched.
 * 2. Listings that are new, edited or scored on older data are rescored.
 *
 * A failure here is logged and never fails the deploy.
 *
 *   npx tsx scripts/osm/seed-snapshot.ts
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma";
import { recomputeAccessibility } from "../../src/lib/osm/sync";

type Row = { id: string; category: string; subcategory: string | null; name: string | null; lat: number; lng: number; areaHa: number | null; geometry: unknown; syncedAt: string };

async function main() {
  const snap = JSON.parse(gunzipSync(readFileSync("prisma/data/osm-snapshot.json.gz")).toString("utf8")) as { rows: Row[] };
  const present = new Set((await prisma.osmFeature.groupBy({ by: ["category"] })).map((g) => g.category));
  const missing = snap.rows.filter((r) => !present.has(r.category));

  if (missing.length) {
    const data = missing.map((r) => ({
      ...r,
      syncedAt: new Date(r.syncedAt),
      geometry: r.geometry == null ? Prisma.DbNull : (r.geometry as Prisma.InputJsonValue),
    }));
    for (let i = 0; i < data.length; i += 1000) await prisma.osmFeature.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
    const cats = [...new Set(missing.map((r) => r.category))];
    console.log(`[osm] filled ${missing.length} places from the snapshot (${cats.join(", ")})`);
  } else {
    console.log("[osm] every category already has places — snapshot not needed");
  }

  await recomputeAccessibility({ onlyStale: true, log: console.log });
}

main()
  .catch((e) => console.error("[osm] snapshot/accessibility step failed:", e instanceof Error ? e.message : e))
  .finally(() => prisma.$disconnect());
