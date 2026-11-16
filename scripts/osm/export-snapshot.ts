/**
 * Writes the local OpenStreetMap import to prisma/data/osm-snapshot.json.gz,
 * which the Vercel build loads into a database that has no places yet
 * (scripts/osm/seed-snapshot.ts). Re-run after a fresh local `npm run osm:sync`.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/osm/export-snapshot.ts
 *
 * Data © OpenStreetMap contributors, ODbL — the site credits it wherever it is shown.
 */
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import prisma from "../../src/lib/prisma";

async function main() {
  const rows = await prisma.osmFeature.findMany({
    select: { id: true, category: true, subcategory: true, name: true, lat: true, lng: true, areaHa: true, geometry: true, syncedAt: true },
    orderBy: { id: "asc" },
  });
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), license: "ODbL — © OpenStreetMap contributors", rows });
  writeFileSync("prisma/data/osm-snapshot.json.gz", gzipSync(json, { level: 9 }));
  const byCat = rows.reduce<Record<string, number>>((m, r) => ((m[r.category] = (m[r.category] ?? 0) + 1), m), {});
  console.log(`[osm] snapshot: ${rows.length} places`, byCat);
}

main().finally(() => prisma.$disconnect());
