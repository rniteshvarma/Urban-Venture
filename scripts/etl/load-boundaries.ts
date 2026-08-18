/**
 * Village boundary loader (AGENTS.md geo spec, Part 2.2).
 *
 *   npm run etl:boundaries -- --state=TG --file=./data/boundaries/tg-villages.geojson --source=datameet
 *
 * Consumes a GeoJSON FeatureCollection (convert Datameet shapefiles with
 * `ogr2ogr -f GeoJSON out.geojson in.shp -t_srs EPSG:4326`). For each feature it
 * joins to a RevenueVillage — census code -> LGD code -> name+mandal fuzzy match
 * (failures route to ResolutionQueue) — then writes the boundary as MultiPolygon
 * SRID 4326 and derives centroid + area via PostGIS. Requires PostGIS
 * (prisma/sql/postgis-setup.sql applied first).
 */

import { readFileSync, existsSync } from 'node:fs';
import prisma from '../../src/lib/prisma';
import { resolveVillage } from '../../src/lib/geo/resolver';

type GeomQuality = 'CENTROID_ONLY' | 'APPROX_POLYGON' | 'SURVEYED';

interface Feature {
  type: string;
  properties: Record<string, unknown>;
  geometry: unknown;
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

/** Fuzzy-pick a property whose key contains all tokens (case/punct-insensitive). */
function prop(props: Record<string, unknown>, tokens: string[]): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wanted = tokens.map(norm);
  const key = Object.keys(props).find((k) => {
    const kn = norm(k);
    return wanted.every((t) => kn.includes(t));
  });
  const v = key ? props[key] : undefined;
  return v == null ? undefined : String(v).trim();
}

async function verifyPostgis(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT PostGIS_Version()`;
  } catch {
    throw new Error('PostGIS not available. Run: psql "$DATABASE_URL" -f prisma/sql/postgis-setup.sql');
  }
}

async function main() {
  const state = (arg('state') ?? '').toUpperCase();
  const file = arg('file');
  const source = arg('source') ?? 'datameet';
  const quality = (arg('quality') as GeomQuality) ?? 'APPROX_POLYGON';
  if (!file) throw new Error('Pass --file=path.geojson');
  if (!existsSync(file)) throw new Error(`Missing boundary file: ${file}`);

  await verifyPostgis();

  console.log(`\n▶ Boundary load: ${state} from ${file} (source=${source}, quality=${quality})\n`);
  const fc = JSON.parse(readFileSync(file, 'utf8')) as { features?: Feature[] };
  const features = fc.features ?? [];
  if (features.length === 0) throw new Error('GeoJSON has no features');

  let matched = 0;
  let queued = 0;
  let processed = 0;

  for (const f of features) {
    processed++;
    const props = f.properties ?? {};
    const census = prop(props, ['census']) ?? prop(props, ['c', 'code']);
    const lgd = prop(props, ['lgd']);
    const name = prop(props, ['village', 'name']) ?? prop(props, ['name']) ?? '';
    const mandal = prop(props, ['sub', 'district']) ?? prop(props, ['mandal']) ?? prop(props, ['tehsil']);
    const district = prop(props, ['district']);

    // ── Join to a village: census -> lgd -> fuzzy name+mandal ──
    let villageId: string | null = null;
    if (census) {
      const v = await prisma.revenueVillage.findFirst({ where: { censusCode2011: census } });
      villageId = v?.id ?? null;
    }
    if (!villageId && lgd) {
      const v = await prisma.revenueVillage.findUnique({ where: { lgdCode: lgd } });
      villageId = v?.id ?? null;
    }
    if (!villageId && name) {
      const r = await resolveVillage(
        { source: `BOUNDARY_${source.toUpperCase()}`, rawName: name, rawDistrict: district, rawMandal: mandal },
        { persist: true },
      );
      if (r.status === 'RESOLVED') villageId = r.villageId ?? null;
    }

    if (!villageId) {
      queued++;
      continue;
    }

    // ── Write geometry + derived centroid/area via PostGIS ──
    const geomJson = JSON.stringify(f.geometry);
    await prisma.$executeRaw`
      UPDATE "RevenueVillage" SET
        boundary    = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geomJson}), 4326)),
        "centroidLat" = ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(${geomJson}), 4326))),
        "centroidLng" = ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(${geomJson}), 4326))),
        "areaHectare" = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${geomJson}), 4326)::geography) / 10000.0,
        "geomSource"  = ${source},
        "geomQuality" = ${quality}::"GeomQuality"
      WHERE id = ${villageId}`;
    matched++;
    if (processed % 250 === 0) process.stdout.write(`\r  Processed ${processed}/${features.length} (matched ${matched}, queued ${queued})`);
  }
  process.stdout.write('\n');

  // ── Coverage report ──
  const total = await prisma.revenueVillage.count({ ...(state ? { where: { mandal: { district: { state: { code: state } } } } } : {}) });
  const withGeom = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*)::bigint AS n FROM "RevenueVillage" WHERE boundary IS NOT NULL`;
  const cov = Number(withGeom[0]?.n ?? 0);
  console.log(`\n  Features:  ${features.length}`);
  console.log(`  Matched:   ${matched}`);
  console.log(`  Queued:    ${queued} (unresolved — see ResolutionQueue)`);
  console.log(`  Coverage:  ${cov} of ${total} villages have geometry (${total ? ((cov / total) * 100).toFixed(1) : '0'}%)\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\n✖ Boundary load failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
