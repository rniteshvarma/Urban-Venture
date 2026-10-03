/**
 * OpenStreetMap import and accessibility recompute.
 *
 * - syncOsm(): fetch every category for the region and replace its rows. A
 *   category whose fetch fails keeps its previous rows (the run is PARTIAL).
 * - recomputeAccessibility(): score every listing with a pin.
 * - runOsmJob(): the scheduled entry point (daily). Re-imports only the
 *   categories older than 30 days, oldest first, within a time budget so a
 *   300 s serverless run never times out mid-write — what doesn't fit is
 *   picked up the next day. Then rescores listings that are new, edited or
 *   scored on older data (or everything after an import).
 *
 * Never part of the build: a slow or unavailable Overpass server must not be
 * able to block a deploy.
 */
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { OSM_CATEGORY_KEYS, type OsmCategory } from "./categories";
import { buildQuery, fetchOverpass, normalise } from "./overpass";
import { ACCESSIBILITY_VERSION, computeAccessibility, type PlaceIndex, type PointPlace, type ShapePlace } from "./accessibility";
import type { Ring } from "./geo";

const SYNC_EVERY_MS = 30 * 24 * 3600_000;
const RUN_LOCK_MS = 10 * 60_000;

type Log = (line: string) => void;

/**
 * `budgetMs` stops starting new categories after that long; `hardDeadline`
 * (epoch ms) also cuts off a category's fetch in flight.
 */
export async function syncOsm(opts: { categories?: OsmCategory[]; log?: Log; budgetMs?: number; hardDeadline?: number } = {}) {
  const log = opts.log ?? (() => {});
  const categories = opts.categories ?? OSM_CATEGORY_KEYS;
  const started = Date.now();
  const run = await prisma.osmSyncRun.create({ data: { status: "RUNNING" } });
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};

  const deferred: string[] = [];
  for (const category of categories) {
    if (opts.budgetMs != null && Date.now() - started > opts.budgetMs) { deferred.push(category); continue; }
    const t = Date.now();
    try {
      const places = normalise(category, await fetchOverpass(buildQuery(category), undefined, opts.hardDeadline));
      const rows = places.map((p) => ({ ...p, geometry: p.geometry ? (p.geometry as unknown as Prisma.InputJsonValue) : Prisma.DbNull }));
      const writes: Prisma.PrismaPromise<unknown>[] = [prisma.osmFeature.deleteMany({ where: { category } })];
      for (let i = 0; i < rows.length; i += 1000) writes.push(prisma.osmFeature.createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true }));
      await prisma.$transaction(writes);
      counts[category] = rows.length;
      log(`[osm] ${category}: ${rows.length} places (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    } catch (e) {
      errors[category] = e instanceof Error ? e.message.slice(0, 300) : String(e);
      log(`[osm] ${category}: FAILED — kept previous data — ${errors[category]}`);
    }
    await new Promise((r) => setTimeout(r, 1000)); // be polite to the public servers
  }

  if (deferred.length) log(`[osm] out of time budget — deferred to the next run: ${deferred.join(", ")}`);
  const attempted = categories.length - deferred.length;
  const failed = Object.keys(errors).length;
  const status = failed === 0 && !deferred.length ? "SUCCESS" : attempted > 0 && failed === attempted ? "FAILED" : "PARTIAL";
  await prisma.osmSyncRun.update({
    where: { id: run.id },
    data: { status, finishedAt: new Date(), counts, errors: failed ? errors : Prisma.DbNull },
  });
  return { runId: run.id, status, counts, errors, deferred };
}

/** Every stored place, grouped the way computeAccessibility() reads them. */
export async function loadPlaceIndex(): Promise<PlaceIndex> {
  const rows = await prisma.osmFeature.findMany({
    select: { id: true, category: true, subcategory: true, name: true, lat: true, lng: true, areaHa: true, geometry: true },
  });
  const idx: PlaceIndex = {
    hospital: [], transit: [], orr_exit: [], bus_station: [], airport: [], school: [], college: [], mall: [],
    job_hub: [], park: [], landfill: [], quarry: [], sewage: [], lake: [], power_line: [],
  };
  for (const r of rows) {
    if (r.category === "lake" || r.category === "power_line") {
      (idx[r.category] as ShapePlace[]).push({ id: r.id, name: r.name, rings: (r.geometry as unknown as Ring[]) ?? [] });
    } else if (r.category in idx) {
      (idx[r.category as keyof PlaceIndex] as PointPlace[]).push({ id: r.id, name: r.name, lat: r.lat, lng: r.lng, sub: r.subcategory, areaHa: r.areaHa });
    }
  }
  return idx;
}

export async function recomputeAccessibility(opts: { onlyStale?: boolean; log?: Log } = {}) {
  const log = opts.log ?? (() => {});
  const idx = await loadPlaceIndex();
  // Scoring against an empty or half-missing import would publish nonsense.
  if (idx.hospital.length === 0 || idx.transit.length === 0 || idx.orr_exit.length === 0) {
    log("[osm] recompute skipped: OpenStreetMap data is missing — run the import first");
    return { computed: 0, skipped: true as const };
  }

  const projects = await prisma.project.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, latitude: true, longitude: true, propertyType: true, updatedAt: true, accessibility: { select: { computedAt: true, version: true } } },
  });
  const precision = new Map(
    (await prisma.$queryRaw<{ id: string; p: string | null }[]>`SELECT id, specifications->>'coordPrecision' AS p FROM "Project" WHERE latitude IS NOT NULL`).map((r) => [r.id, r.p]),
  );
  const lastSync = await prisma.osmSyncRun.findFirst({ where: { status: { in: ["SUCCESS", "PARTIAL"] } }, orderBy: { startedAt: "desc" }, select: { finishedAt: true } });

  const due = projects.filter((p) => {
    if (!opts.onlyStale) return true;
    const a = p.accessibility;
    return !a || a.version !== ACCESSIBILITY_VERSION || a.computedAt < p.updatedAt || (lastSync?.finishedAt != null && a.computedAt < lastSync.finishedAt);
  });

  const now = new Date();
  const rows = due.map((p) => {
    const r = computeAccessibility({ lat: p.latitude!, lng: p.longitude!, propertyType: p.propertyType, coordPrecision: precision.get(p.id) }, idx);
    return {
      projectId: p.id,
      score: r.score,
      confidence: r.confidence,
      version: r.version,
      components: r.components as unknown as Prisma.InputJsonValue,
      nearest: r.nearest as unknown as Prisma.InputJsonValue,
      within: r.within as unknown as Prisma.InputJsonValue,
      watchOuts: r.watchOuts as unknown as Prisma.InputJsonValue,
      computedAt: now,
    };
  });
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    await prisma.$transaction([
      prisma.projectAccessibility.deleteMany({ where: { projectId: { in: chunk.map((c) => c.projectId) } } }),
      prisma.projectAccessibility.createMany({ data: chunk }),
    ]);
  }
  log(`[osm] accessibility: ${rows.length} listing(s) scored${opts.onlyStale ? " (new or stale only)" : ""}`);
  return { computed: rows.length, skipped: false as const };
}

/** Categories due for a refresh (never imported, or older than 30 days), oldest first. */
export async function dueCategories(force = false): Promise<OsmCategory[]> {
  if (force) return [...OSM_CATEGORY_KEYS];
  const last = new Map(
    (await prisma.osmFeature.groupBy({ by: ["category"], _max: { syncedAt: true } })).map((g) => [g.category, g._max.syncedAt?.getTime() ?? 0]),
  );
  return OSM_CATEGORY_KEYS
    .filter((c) => Date.now() - (last.get(c) ?? 0) > SYNC_EVERY_MS)
    .sort((a, b) => (last.get(a) ?? 0) - (last.get(b) ?? 0));
}

/** Scheduled entry point (daily cron and the admin trigger). */
export async function runOsmJob(opts: { forceSync?: boolean; log?: Log; budgetMs?: number } = {}) {
  const log = opts.log ?? ((l: string) => console.log(l));
  const running = await prisma.osmSyncRun.findFirst({ where: { status: "RUNNING", startedAt: { gte: new Date(Date.now() - RUN_LOCK_MS) } } });
  if (running) return { skipped: "an import is already running" };

  const due = await dueCategories(opts.forceSync);
  // The hard deadline leaves room for rescoring inside a 300 s serverless run.
  const hardDeadline = opts.budgetMs != null ? Date.now() + opts.budgetMs + 30_000 : undefined;
  const sync = due.length ? await syncOsm({ categories: due, log, budgetMs: opts.budgetMs, hardDeadline }) : null;
  const imported = sync ? Object.keys(sync.counts).length > 0 : false;
  const recompute = await recomputeAccessibility({ onlyStale: !imported, log });
  return { due, sync, recompute };
}
