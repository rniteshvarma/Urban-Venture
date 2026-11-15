/**
 * Scores every public listing with the eight-lens Property Tiger Score
 * (lenses.ts) and stores the result on the Project row. Reads only data we
 * already hold: listings, developer records, map places and area figures.
 *
 * Runs in the build (scripts/score/compute.ts) and in the daily listings cron.
 */
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { PUBLIC_PROJECT } from "../site";
import { haversineKm, median, monthsUntil } from "../inventory/rating";
import { scoreListing, SCORE_VERSION, type ScoreInput } from "./lenses";
import type { DeveloperRecordJson } from "../developers/sync";

type Log = (msg: string) => void;

/** Areas further than this from every tracked corridor get no area-based lenses. */
const AREA_RADIUS_KM = 15;

type UnitRow = { unitCategory: string; ratePerSqFt: number | null; ratePerSqYd: number | null; priceLakh: number | null; areaValue: number | null; areaSqFt: number | null; areaSqYd: number | null };

/** The listing's typical price per unit area, in the unit buyers use for its type. */
export function listingRate(propertyType: string, units: UnitRow[]): { rate: number; unit: "sq.ft" | "sq.yd" | "acre" } | null {
  const isLand = propertyType === "Land";
  const isPlot = propertyType === "Plots";
  const rates: number[] = [];
  for (const u of units) {
    if (isLand) {
      if (u.unitCategory === "LAND" && u.priceLakh && u.areaValue) rates.push((u.priceLakh * 100_000) / u.areaValue);
    } else if (isPlot) {
      const r = u.ratePerSqYd ?? (u.priceLakh && u.areaSqYd ? (u.priceLakh * 100_000) / u.areaSqYd : null);
      if (r) rates.push(r);
    } else {
      const r = u.ratePerSqFt ?? (u.priceLakh && u.areaSqFt ? (u.priceLakh * 100_000) / u.areaSqFt : null);
      if (r) rates.push(r);
    }
  }
  const m = median(rates);
  if (m == null || !Number.isFinite(m) || m <= 0) return null;
  return { rate: m, unit: isLand ? "acre" : isPlot ? "sq.yd" : "sq.ft" };
}

export async function scoreAllListings(opts: { log?: Log; now?: Date } = {}) {
  const log = opts.log ?? (() => {});
  const now = opts.now ?? new Date();

  const listings = await prisma.project.findMany({
    where: PUBLIC_PROJECT,
    select: {
      id: true, propertyType: true, corridor: true, reraNumber: true, latitude: true, longitude: true,
      developerSlug: true, listingSource: true, approvals: true, approvalStatus: true, specifications: true,
      unitTypes: { select: { unitCategory: true, ratePerSqFt: true, ratePerSqYd: true, priceLakh: true, areaValue: true, areaSqFt: true, areaSqYd: true } },
      accessibility: { select: { components: true, nearest: true, watchOuts: true } },
    },
  });

  const developers = new Map(
    (await prisma.developer.findMany({ select: { slug: true, name: true, established: true, stats: true } })).map((d) => [d.slug, d]),
  );
  // Per-project delivery flags from the developer records (exact project ids).
  const flagsById = new Map<string, string[]>();
  for (const d of developers.values()) {
    const rec = d.stats as DeveloperRecordJson | null;
    for (const p of rec?.projects ?? []) flagsById.set(p.id, p.flags as string[]);
  }

  const corridors = (await prisma.corridorProfile.findMany({
    where: { isPublished: true, centroidLat: { not: null }, centroidLng: { not: null } },
    select: { shortName: true, name: true, centroidLat: true, centroidLng: true, infraScore: true, marketStats: true },
  })).map((c) => {
    const ms = c.marketStats as { primaryAsset?: string; forecast?: Record<string, { scenarios?: { base?: { cagr5?: number } } }> } | null;
    const cagr = (asset: string) => ms?.forecast?.[asset]?.scenarios?.base?.cagr5 ?? null;
    return { name: c.shortName || c.name, lat: c.centroidLat!, lng: c.centroidLng!, infraScore: c.infraScore, plot: cagr("plot") ?? cagr(ms?.primaryAsset ?? ""), apartment: cagr("apartment") ?? cagr(ms?.primaryAsset ?? "") };
  });

  type Spec = { listingKind?: string; litigation?: string | null; possessionRera?: string | null; possessionTarget?: string | null; constructionStatus?: string | null; coordPrecision?: string | null };
  const kindOf = (l: (typeof listings)[number]) => ((l.specifications as Spec | null)?.listingKind === "LAND_LISTING" || l.listingSource === "SELLER" ? "LAND" : "PROJECT") as ScoreInput["kind"];

  // Peer medians: same area (zone), same property type, same kind of listing.
  const rateOf = new Map(listings.map((l) => [l.id, listingRate(l.propertyType, l.unitTypes)]));
  const peers = new Map<string, number[]>();
  for (const l of listings) {
    const r = rateOf.get(l.id);
    if (!r) continue;
    const k = `${l.corridor}|${l.propertyType}|${kindOf(l)}`;
    peers.set(k, [...(peers.get(k) ?? []), r.rate]);
  }

  let scored = 0, unscored = 0;
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  for (const l of listings) {
    const spec = (l.specifications ?? {}) as Spec;
    const kind = kindOf(l);
    const flags = new Set(flagsById.get(l.id) ?? []);
    const dev = l.developerSlug ? developers.get(l.developerSlug) : undefined;
    const stats = (dev?.stats as DeveloperRecordJson | null)?.stats;
    const r = rateOf.get(l.id) ?? null;
    const peerList = peers.get(`${l.corridor}|${l.propertyType}|${kind}`) ?? [];
    // Peer median excludes the listing itself.
    const others = r ? (() => { const copy = [...peerList]; copy.splice(copy.indexOf(r.rate), 1); return copy; })() : peerList;

    const comps = (l.accessibility?.components ?? null) as { key: string; points: number; max: number; note: string }[] | null;
    const comp = (k: string) => comps?.find((c) => c.key === k);
    const nearest = (l.accessibility?.nearest ?? {}) as Record<string, { km: number; name: string | null } | undefined>;
    const access: ScoreInput["access"] =
      comps && comp("connectivity") && comp("daily") && comp("jobs") && comp("green")
        ? {
            connectivity: comp("connectivity")!, daily: comp("daily")!, jobs: comp("jobs")!, green: comp("green")!,
            hospitalKm: nearest.hospital?.km ?? null,
            lakeKm: nearest.lake?.km ?? null,
            lakeName: nearest.lake?.name ?? null,
            watchOuts: ((l.accessibility?.watchOuts ?? []) as { key: string; label: string }[]),
          }
        : null;

    let area: ScoreInput["area"] = null;
    if (l.latitude != null && l.longitude != null && corridors.length) {
      const best = corridors
        .map((c) => ({ c, km: haversineKm({ lat: l.latitude!, lng: l.longitude! }, { lat: c.lat, lng: c.lng }) }))
        .sort((a, b) => a.km - b.km)[0];
      if (best.km <= AREA_RADIUS_KM) {
        const asset = l.propertyType === "Plots" || l.propertyType === "Land" ? best.c.plot : best.c.apartment;
        area = { name: best.c.name, infraScore: best.c.infraScore ?? null, baseCagr5: asset ?? null };
      }
    }

    const possession = spec.possessionRera ?? spec.possessionTarget ?? null;
    const input: ScoreInput = {
      kind,
      propertyType: l.propertyType,
      reraRegistered: !!l.reraNumber?.trim(),
      litigation: spec.litigation === "Yes" || flags.has("LITIGATION") ? "Yes" : spec.litigation === "No" ? "No" : null,
      criminalCase: flags.has("CRIMINAL_CASE"),
      revoked: flags.has("REVOKED"),
      layoutStated: kind === "LAND" && (l.approvals.some((a) => /approved|LP number|LRS/i.test(a)) || /APPROVED/.test(l.approvalStatus ?? "")),
      builder: kind === "PROJECT" && dev && stats
        ? { name: dev.name, established: dev.established, projects: stats.projects, withReraDeadline: stats.withReraDeadline, overdue: stats.overdue, extended: stats.extended, regulatoryOrders: stats.regulatoryOrders }
        : null,
      ready: spec.constructionStatus === "READY",
      monthsToPossession: monthsUntil(possession, now),
      overdue: flags.has("OVERDUE"),
      rate: r?.rate ?? null,
      rateUnit: r?.unit ?? null,
      peerMedianRate: others.length >= 3 ? median(others) : null,
      peerCount: others.length,
      zone: l.corridor,
      access,
      approxPin: !!spec.coordPrecision && spec.coordPrecision !== "exact",
      area,
      now,
    };
    const result = scoreListing(input);
    if (result.score != null) scored++; else unscored++;
    writes.push(prisma.project.update({
      where: { id: l.id },
      data: { tigerScore: result.score, tigerScoreData: result as unknown as Prisma.InputJsonValue, tigerScoredAt: now },
    }));
  }

  for (let i = 0; i < writes.length; i += 200) await prisma.$transaction(writes.slice(i, i + 200));
  log(`[score] ${SCORE_VERSION}: ${scored} listings scored, ${unscored} without enough data (of ${listings.length})`);
  return { scored, unscored, total: listings.length };
}
