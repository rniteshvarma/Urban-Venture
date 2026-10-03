/**
 * Corridor prices measured from our own listings (developer price lists from
 * the researched inventory, plus approved seller listings).
 *
 * - Each project counts once: its units' median rate, so one big project
 *   with 40 unit types can't drown out the rest of the area.
 * - Plots are ₹/sq.yd; apartments ₹/sq.ft of the listed (built-up) area.
 *   Villas, row houses and commercial units are left out of both.
 * - The search radius grows (5 → 8 → 12 km from the corridor centre) until
 *   enough projects are found; the radius used is reported.
 * - Too few projects → no figure, never a guess.
 *
 * Pure: unit-tested in market.test.ts.
 */
import { haversineKm } from "../osm/geo";

export type Asset = "plot" | "apartment";
export type PriceConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface ListingForRates {
  id: string;
  lat: number;
  lng: number;
  units: { category: string; areaSqFt: number | null; areaSqYd: number | null; priceLakh: number | null }[];
}

export interface AssetRates {
  unit: "₹/sq.yd" | "₹/sq.ft";
  p25: number;
  median: number;
  p75: number;
  /** Projects the figure is based on */
  projects: number;
  /** Priced unit types behind it */
  units: number;
  radiusKm: number;
  confidence: PriceConfidence;
}

export const RADII_KM = [5, 8, 12];
/** Projects needed before a radius is accepted (smaller samples widen the search). */
const ENOUGH = 4;
/** Below this many projects there is no figure at all. */
const MIN_PROJECTS = 2;

// Rates outside these bands are data errors (a price in rupees typed as lakhs…).
const SANE: Record<Asset, [number, number]> = { plot: [2_000, 600_000], apartment: [1_500, 60_000] };

export function unitRate(asset: Asset, u: ListingForRates["units"][number]): number | null {
  if (!u.priceLakh || u.priceLakh <= 0) return null;
  const rupees = u.priceLakh * 100_000;
  let rate: number | null = null;
  if (asset === "plot" && u.category === "PLOT" && u.areaSqYd) rate = rupees / u.areaSqYd;
  if (asset === "apartment" && u.category === "APARTMENT" && u.areaSqFt) rate = rupees / u.areaSqFt;
  if (rate == null) return null;
  const [lo, hi] = SANE[asset];
  return rate >= lo && rate <= hi ? rate : null;
}

export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

const round = (n: number, to: number) => Math.round(n / to) * to;

export function confidenceFor(projects: number): PriceConfidence | null {
  return projects >= 10 ? "HIGH" : projects >= ENOUGH ? "MEDIUM" : projects >= MIN_PROJECTS ? "LOW" : null;
}

export function measureRates(centre: { lat: number; lng: number }, listings: ListingForRates[], asset: Asset): AssetRates | null {
  const perProject = listings
    .map((l) => {
      const rates = l.units.map((u) => unitRate(asset, u)).filter((r): r is number => r != null).sort((a, b) => a - b);
      return rates.length ? { km: haversineKm(centre.lat, centre.lng, l.lat, l.lng), rate: quantile(rates, 0.5), units: rates.length } : null;
    })
    .filter((x): x is { km: number; rate: number; units: number } => x != null);

  for (let i = 0; i < RADII_KM.length; i++) {
    const r = RADII_KM[i];
    const inside = perProject.filter((p) => p.km <= r);
    const last = i === RADII_KM.length - 1;
    if (inside.length < ENOUGH && !last) continue;
    const confidence = confidenceFor(inside.length);
    if (!confidence) return null;
    const sorted = inside.map((p) => p.rate).sort((a, b) => a - b);
    const step = asset === "plot" ? 500 : 50;
    return {
      unit: asset === "plot" ? "₹/sq.yd" : "₹/sq.ft",
      p25: round(quantile(sorted, 0.25), step),
      median: round(quantile(sorted, 0.5), step),
      p75: round(quantile(sorted, 0.75), step),
      projects: inside.length,
      units: inside.reduce((n, p) => n + p.units, 0),
      radiusKm: r,
      confidence,
    };
  }
  return null;
}
