/**
 * Recomputes every corridor's market numbers from measured data and writes
 * them onto CorridorProfile, so every screen (corridor pages, compare,
 * forecast, homepage cards, calculator, reports, seller fair value,
 * concierge) reads the same figures.
 *
 *   prices     our listings within the corridor's radius (rates.ts)
 *   forecast   published city anchors + corridor infra score (forecast.ts)
 *   counts     RERA-registered / under-construction projects nearby
 *   approvals  ApprovalRecord rows rebuilt from those projects' TG-RERA numbers
 *
 * Nothing here is estimated by hand: a corridor without enough listings gets
 * no price, and the page says so.
 */
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { lookupPlace } from "../infra-intel/geo";
import { haversineKm } from "../osm/geo";
import { CITY, LAND_EVIDENCE, type SourcedFigure } from "./anchors";
import { measureRates, quantile, unitRate, type Asset, type AssetRates, type ListingForRates } from "./rates";
import { forecastCorridor, gainPct, FORECAST_VERSION, type CorridorForecast } from "./forecast";

/** Radius for the project counts (and for assigning RERA records to a corridor). */
export const COUNT_RADIUS_KM = 8;
/** Marks the approval rows this job owns, so a rebuild never touches hand-entered ones. */
export const RERA_SYNC_NOTE = "Source: TG-RERA registration of a project in our listings";

export interface MarketListing extends ListingForRates {
  name: string;
  developer: string;
  reraNumber: string | null;
  reraUrl: string | null;
  /** From the listing's construction status; "unknown" when not stated */
  status: "active" | "ready" | "unknown";
}

export interface MarketContext {
  listings: MarketListing[];
  /** City-wide reference prices the "early-stage" check compares against */
  cityPlotMedian: number | null;
  cityAptAvg: number;
}

export interface CorridorMarketStats {
  version: string;
  computedAt: string;
  centre: { lat: number; lng: number } | null;
  primaryAsset: Asset;
  rates: Partial<Record<Asset, AssetRates>>;
  forecast: Record<Asset, CorridorForecast>;
  counts: { totalProjects: number; reraProjects: number; activeProjects: number; readyProjects: number; radiusKm: number };
  landEvidence: SourcedFigure[];
  city: { plotMedianSqYd: number | null; aptAvgSqFt: SourcedFigure; rentalYield: SourcedFigure };
}

const ACTIVE_STATUSES = new Set(["UNDER_CONSTRUCTION", "NEW_LAUNCH", "PRE_LAUNCH"]);

export async function loadMarketContext(): Promise<MarketContext> {
  const rows = await prisma.project.findMany({
    where: { status: "ACTIVE", latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true, name: true, developer: true, latitude: true, longitude: true, reraNumber: true, reraUrl: true, specifications: true,
      unitTypes: { select: { unitCategory: true, areaSqFt: true, areaSqYd: true, priceLakh: true } },
    },
  });
  const listings: MarketListing[] = rows.map((r) => {
    const spec = (r.specifications ?? {}) as { constructionStatus?: string };
    return {
      id: r.id, name: r.name, developer: r.developer, lat: r.latitude!, lng: r.longitude!,
      reraNumber: r.reraNumber, reraUrl: r.reraUrl,
      status: ACTIVE_STATUSES.has(String(spec.constructionStatus ?? "")) ? "active" : spec.constructionStatus === "READY" ? "ready" : "unknown",
      units: r.unitTypes.map((u) => ({ category: String(u.unitCategory), areaSqFt: u.areaSqFt, areaSqYd: u.areaSqYd, priceLakh: u.priceLakh })),
    };
  });
  // Project-level median plot rates across the whole region.
  const plotRates = listings
    .map((l) => l.units.map((u) => unitRate("plot", u)).filter((x): x is number => x != null).sort((a, b) => a - b))
    .filter((r) => r.length)
    .map((r) => quantile(r, 0.5))
    .sort((a, b) => a - b);
  return { listings, cityPlotMedian: plotRates.length >= 10 ? Math.round(quantile(plotRates, 0.5)) : null, cityAptAvg: CITY.avgPriceSqFt.value };
}

export function corridorCentre(c: { centroidLat: number | null; centroidLng: number | null; shortName: string | null; name: string }) {
  if (c.centroidLat != null && c.centroidLng != null) return { lat: c.centroidLat, lng: c.centroidLng };
  const p = lookupPlace(c.shortName || c.name);
  return p ? { lat: p.lat, lng: p.lng } : null;
}

/** Pure: everything except the database write. */
export function buildCorridorMarket(slug: string, centre: { lat: number; lng: number } | null, infraScore: number | null, ctx: MarketContext): CorridorMarketStats {
  const rates: Partial<Record<Asset, AssetRates>> = {};
  if (centre) {
    const plot = measureRates(centre, ctx.listings, "plot");
    const apartment = measureRates(centre, ctx.listings, "apartment");
    if (plot) rates.plot = plot;
    if (apartment) rates.apartment = apartment;
  }
  const near = centre ? ctx.listings.filter((l) => haversineKm(centre.lat, centre.lng, l.lat, l.lng) <= COUNT_RADIUS_KM) : [];
  const forecast = {
    plot: forecastCorridor({
      asset: "plot", infraScore, priceConfidence: rates.plot?.confidence ?? null,
      relativePrice: rates.plot && ctx.cityPlotMedian ? rates.plot.median / ctx.cityPlotMedian : null,
    }),
    apartment: forecastCorridor({
      asset: "apartment", infraScore, priceConfidence: rates.apartment?.confidence ?? null,
      relativePrice: rates.apartment ? rates.apartment.median / ctx.cityAptAvg : null,
    }),
  };
  return {
    version: FORECAST_VERSION,
    computedAt: new Date().toISOString(),
    centre,
    // Corridors are land-led; a corridor with only apartment data is shown as apartments.
    primaryAsset: rates.plot || !rates.apartment ? "plot" : "apartment",
    rates,
    forecast,
    counts: {
      totalProjects: near.length,
      reraProjects: near.filter((l) => l.reraNumber).length,
      activeProjects: near.filter((l) => l.status === "active").length,
      readyProjects: near.filter((l) => l.status === "ready").length,
      radiusKm: COUNT_RADIUS_KM,
    },
    landEvidence: LAND_EVIDENCE[slug] ?? [],
    city: { plotMedianSqYd: ctx.cityPlotMedian, aptAvgSqFt: CITY.avgPriceSqFt, rentalYield: CITY.rentalYield },
  };
}

/** The flat CorridorProfile fields every screen reads, from the stats. */
export function profileFields(m: CorridorMarketStats) {
  const f = m.forecast[m.primaryAsset];
  return {
    plotPriceMinSqYd: m.rates.plot?.p25 ?? null,
    plotPriceMidSqYd: m.rates.plot?.median ?? null,
    plotPriceMaxSqYd: m.rates.plot?.p75 ?? null,
    aptPriceMinSqFt: m.rates.apartment?.p25 ?? null,
    aptPriceMaxSqFt: m.rates.apartment?.p75 ?? null,
    price2026SqYd: m.rates.plot?.median ?? null,
    // No measured history yet — these stay empty until quarterly snapshots exist.
    price2020SqYd: null,
    price2022SqYd: null,
    price2024SqYd: null,
    appreciationSince2020: null,
    historicalCAGR: null,
    // Plots earn no rent; apartments use the city figure (shown with its source on the page).
    rentalYieldMin: null,
    rentalYieldMax: null,
    projectedCAGRMin: f.scenarios.conservative.cagr10,
    projectedCAGRMax: f.scenarios.optimistic.cagr10,
    forecast3yrMin: gainPct(f, "conservative", 3),
    forecast3yrMax: gainPct(f, "optimistic", 3),
    forecast5yrMin: gainPct(f, "conservative", 5),
    forecast5yrMax: gainPct(f, "optimistic", 5),
    forecast10yrMin: gainPct(f, "conservative", 10),
    forecast10yrMax: gainPct(f, "optimistic", 10),
    priceIndex2031: f.scenarios.base.index[5],
  };
}

export const SNAPSHOT_SOURCE = "Property Tiger listings — median developer price";

/**
 * Records this quarter's measured median per asset as a price observation
 * (one row per corridor, asset and quarter; re-runs in the same quarter
 * update it). This is how a real price history accumulates — growth figures
 * appear once a quarter a year earlier exists.
 */
export async function recordQuarterlySnapshot(slug: string, m: CorridorMarketStats, at = new Date(m.computedAt)) {
  const year = at.getUTCFullYear();
  const quarter = Math.floor(at.getUTCMonth() / 3) + 1;
  const prevQ = quarter === 1 ? { year: year - 1, quarter: 4 } : { year, quarter: quarter - 1 };
  for (const asset of ["plot", "apartment"] as Asset[]) {
    const r = m.rates[asset];
    if (!r) continue;
    const isPlot = asset === "plot";
    const pricePerSqFt = isPlot ? Math.round(r.median / 9) : r.median;
    const sameAsset = { corridor: slug, source: SNAPSHOT_SOURCE, pricePerSqYd: isPlot ? { not: null } : null } as const;
    const [existing, yearAgo, lastQ] = await Promise.all([
      prisma.appreciationHistory.findFirst({ where: { ...sameAsset, year, quarter } }),
      prisma.appreciationHistory.findFirst({ where: { ...sameAsset, year: year - 1, quarter } }),
      prisma.appreciationHistory.findFirst({ where: { ...sameAsset, ...prevQ } }),
    ]);
    const change = (prev: { pricePerSqFt: number } | null) => (prev && prev.pricePerSqFt > 0 ? Math.round(((pricePerSqFt - prev.pricePerSqFt) / prev.pricePerSqFt) * 1000) / 10 : null);
    const data = {
      corridor: slug, corridorProfileSlug: slug, year, quarter,
      pricePerSqFt, pricePerSqYd: isPlot ? r.median : null,
      yoyChange: change(yearAgo), qoqChange: change(lastQ),
      sampleSize: r.projects, source: SNAPSHOT_SOURCE,
      notes: `${isPlot ? "Plots" : "Apartments"}: median of ${r.projects} projects within ${r.radiusKm} km`,
    };
    if (existing) await prisma.appreciationHistory.update({ where: { id: existing.id }, data });
    else await prisma.appreciationHistory.create({ data });
  }
}

export async function writeCorridorMarket(slug: string, m: CorridorMarketStats, setCentre: boolean) {
  await prisma.corridorProfile.update({
    where: { slug },
    data: {
      ...profileFields(m),
      ...(setCentre && m.centre ? { centroidLat: m.centre.lat, centroidLng: m.centre.lng } : {}),
      marketStats: m as unknown as object,
      marketComputedAt: new Date(m.computedAt),
    },
  });
  await recordQuarterlySnapshot(slug, m);
}

/**
 * Rebuilds the RERA approval rows from our listings: each RERA-registered
 * project goes to its nearest corridor centre within COUNT_RADIUS_KM.
 */
export async function syncReraApprovals(ctx: MarketContext, centres: { slug: string; centre: { lat: number; lng: number } | null }[]) {
  const rows: Prisma.ApprovalRecordCreateManyInput[] = [];
  for (const l of ctx.listings) {
    if (!l.reraNumber) continue;
    let best: { slug: string; km: number } | null = null;
    for (const c of centres) {
      if (!c.centre) continue;
      const km = haversineKm(c.centre.lat, c.centre.lng, l.lat, l.lng);
      if (km <= COUNT_RADIUS_KM && (!best || km < best.km)) best = { slug: c.slug, km };
    }
    if (!best) continue;
    rows.push({
      projectName: l.name, developerName: l.developer, approvalType: "RERA_REGISTRATION", authority: "RERA_TELANGANA",
      approvalNumber: l.reraNumber, reraNumber: l.reraNumber, reraUrl: l.reraUrl, approvalDate: null,
      corridor: best.slug, corridorProfileSlug: best.slug, status: "APPROVED", notes: RERA_SYNC_NOTE, isPublished: true, surveyNumbers: [],
    });
  }
  await prisma.$transaction([
    prisma.approvalRecord.deleteMany({ where: { notes: RERA_SYNC_NOTE } }),
    prisma.approvalRecord.createMany({ data: rows }),
  ]);
  return rows.length;
}
