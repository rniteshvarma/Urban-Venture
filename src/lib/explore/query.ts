// Shared query logic for the Explore Map endpoints (GeoJSON + live count).
//
// Two realities this file adapts to:
//  1. PostGIS is NOT installed in this deployment (and is not even an available
//     extension), so the viewport query is an indexed lat/lng range scan on
//     @@index([listingStatus, latitude, longitude]) rather than ST_MakeEnvelope.
//  2. Project.propertyType is free-text ("Plots", "Residential", "Villa"…),
//     not an enum, so the API's stable tokens are mapped to stored strings.

import type { Prisma } from "@prisma/client";

export const MAX_FEATURES = 3000;

// ── Property type tokens ⇄ stored free-text ──────────────────────────
// The API speaks stable tokens; the database holds display strings. Matching is
// done case-insensitively on substrings so new spellings keep working.
export const PROPERTY_TYPE_TOKENS = {
  RESIDENTIAL_PLOT: ["plot"],
  AGRICULTURAL_LAND: ["land", "agri"],
  VILLA: ["villa"],
  APARTMENT: ["apartment", "flat", "residential"],
  COMMERCIAL: ["commercial", "office", "retail"],
} as const;

export type PropertyTypeToken = keyof typeof PROPERTY_TYPE_TOKENS;

/** Colour-mode key for the "property type" palette. Falls back to OTHER. */
export function tokenForStoredType(stored: string | null | undefined): PropertyTypeToken | "OTHER" {
  const s = (stored ?? "").toLowerCase();
  // Order matters: "residential plot" must read as a plot, not an apartment.
  if (PROPERTY_TYPE_TOKENS.RESIDENTIAL_PLOT.some((k) => s.includes(k))) return "RESIDENTIAL_PLOT";
  if (PROPERTY_TYPE_TOKENS.AGRICULTURAL_LAND.some((k) => s.includes(k))) return "AGRICULTURAL_LAND";
  if (PROPERTY_TYPE_TOKENS.VILLA.some((k) => s.includes(k))) return "VILLA";
  if (PROPERTY_TYPE_TOKENS.COMMERCIAL.some((k) => s.includes(k))) return "COMMERCIAL";
  if (PROPERTY_TYPE_TOKENS.APARTMENT.some((k) => s.includes(k))) return "APARTMENT";
  return "OTHER";
}

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Parse "minLng,minLat,maxLng,maxLat"; null when malformed or inverted. */
export function parseBbox(raw: string | null): Bbox | null {
  if (!raw) return null;
  const parts = raw.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat > maxLat) return null;
  // Clamp to valid ranges; a world-wrapping bbox is treated as full-world.
  return {
    minLng: Math.max(-180, Math.min(180, minLng)),
    minLat: Math.max(-90, Math.min(90, minLat)),
    maxLng: Math.max(-180, Math.min(180, maxLng)),
    maxLat: Math.max(-90, Math.min(90, maxLat)),
  };
}

export interface ExploreFilters {
  types: string[];
  source: "ADMIN" | "SELLER" | "ALL";
  minPriceLakh: number | null;
  maxPriceLakh: number | null;
  minAreaSqYd: number | null;
  maxAreaSqYd: number | null;
  approvals: string[];
  minScore: number | null;
  postedWithinDays: number | null;
  verifiedOnly: boolean;
}

const num = (v: string | null): number | null => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const list = (v: string | null): string[] =>
  (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function parseFilters(sp: URLSearchParams): ExploreFilters {
  const sourceRaw = (sp.get("source") ?? "ALL").toUpperCase();
  return {
    types: list(sp.get("propertyType")),
    source: sourceRaw === "ADMIN" || sourceRaw === "SELLER" ? sourceRaw : "ALL",
    minPriceLakh: num(sp.get("minPrice")),
    maxPriceLakh: num(sp.get("maxPrice")),
    minAreaSqYd: num(sp.get("minArea")),
    maxAreaSqYd: num(sp.get("maxArea")),
    approvals: list(sp.get("approvalStatus")),
    minScore: num(sp.get("minScore")),
    postedWithinDays: num(sp.get("postedWithin")),
    verifiedOnly: sp.get("verifiedOnly") === "true",
  };
}

/**
 * Build the Prisma `where` for the map. Always constrained to APPROVED listings
 * that actually have coordinates — a project without a position is simply
 * absent from the map, never placed at a corridor centroid (Constraint 2).
 */
export function buildWhere(bbox: Bbox | null, f: ExploreFilters): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {
    listingStatus: "APPROVED",
    latitude: bbox ? { gte: bbox.minLat, lte: bbox.maxLat, not: null } : { not: null },
    longitude: bbox ? { gte: bbox.minLng, lte: bbox.maxLng, not: null } : { not: null },
  };

  const and: Prisma.ProjectWhereInput[] = [];

  if (f.source !== "ALL") where.listingSource = f.source;

  if (f.types.length > 0) {
    const needles = f.types.flatMap((t) => {
      const key = t.toUpperCase() as PropertyTypeToken;
      return PROPERTY_TYPE_TOKENS[key] ? [...PROPERTY_TYPE_TOKENS[key]] : [t];
    });
    and.push({ OR: needles.map((n) => ({ propertyType: { contains: n, mode: "insensitive" as const } })) });
  }

  // Price: the listing's band must overlap the requested band.
  if (f.minPriceLakh != null) and.push({ maxBudgetLakhs: { gte: f.minPriceLakh } });
  if (f.maxPriceLakh != null) and.push({ minBudgetLakhs: { lte: f.maxPriceLakh } });

  if (f.minAreaSqYd != null) and.push({ totalAreaSqYd: { gte: f.minAreaSqYd } });
  if (f.maxAreaSqYd != null) and.push({ totalAreaSqYd: { lte: f.maxAreaSqYd } });

  if (f.approvals.length > 0) and.push({ approvalStatus: { in: f.approvals } });

  // Admin inventory has no listing score; only gate seller listings on it so a
  // score filter never hides verified inventory.
  if (f.minScore != null) {
    and.push({ OR: [{ listingSource: "ADMIN" }, { listingScore: { gte: f.minScore } }] });
  }

  if (f.postedWithinDays != null) {
    and.push({ createdAt: { gte: new Date(Date.now() - f.postedWithinDays * 86_400_000) } });
  }

  if (f.verifiedOnly) {
    and.push({ OR: [{ listingSource: "ADMIN" }, { approvalVerified: true }] });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

/**
 * Price quintile thresholds for the current viewport, so colour stays
 * meaningful whether you are looking at Vikarabad or Kokapet. Returns up to 4
 * cut points; fewer when the sample is too small to be meaningful.
 */
export function quintileBreaks(values: number[]): number[] {
  const v = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (v.length < 5) return [];
  const at = (q: number) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
  return [at(0.2), at(0.4), at(0.6), at(0.8)];
}

/** 1..5 band for a price given quintile breaks. Band 3 (mid) when unknown. */
export function bandFor(price: number, breaks: number[]): number {
  if (breaks.length !== 4) return 3;
  for (let i = 0; i < 4; i++) if (price <= breaks[i]) return i + 1;
  return 5;
}

/** Round to ~1m so the payload stays lean. */
export const round5 = (n: number): number => Math.round(n * 1e5) / 1e5;

/**
 * Present an area in the unit a buyer would actually use: acres for anything
 * an acre or larger, square yards below that.
 */
export function displayArea(sqYd: number | null | undefined): { value: number; unit: "acre" | "sqyd" } | null {
  if (!sqYd || sqYd <= 0) return null;
  const SQYD_PER_ACRE = 4840;
  if (sqYd >= SQYD_PER_ACRE) {
    return { value: Math.round((sqYd / SQYD_PER_ACRE) * 100) / 100, unit: "acre" };
  }
  return { value: Math.round(sqYd), unit: "sqyd" };
}
