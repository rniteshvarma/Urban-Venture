/**
 * Rental yields measured from public rental listings.
 *
 * Source: NoBroker owner listings (rent, size, BHK, location, and whether the
 * flat was let out). By the owner's decision (2026-10-12) we only publish our
 * own derived statistics — median rent per sq.ft, typical rent by BHK, gross
 * yield and the listing count — never the listings or their rents.
 *
 * Method, chosen to stay close to reality:
 *   · apartments only (no independent houses, PGs or shared rooms)
 *   · fully furnished flats excluded — their rent pays for furniture the
 *     sale price doesn't include
 *   · listings flagged incorrect excluded; sane bands on size and rent
 *   · each listing is placed by its own coordinates (locality pages mix in
 *     flats from elsewhere), within the corridor's radius
 *   · gross yield = 12 × median rent per sq.ft ÷ the corridor's measured
 *     apartment price (new-launch prices; older resale flats are often
 *     cheaper, so yields on resale can be a little higher)
 *
 * Pure: unit-tested in rentals.test.ts.
 */
import { haversineKm } from "../osm/geo";
import { quantile, RADII_KM } from "../market/rates";

export interface RentalListing {
  id: string;
  rent: number;
  sizeSqft: number;
  bhk: number | null;
  lat: number;
  lng: number;
  furnishing: "FULL" | "SEMI" | "NONE" | null;
  letOut: boolean;
  updatedAt: string | null;
}

const BHK = (t: string | undefined) => {
  const m = t?.match(/BHK(\d)/i) ?? t?.match(/(\d)\s*BHK/i);
  return m ? Number(m[1]) : t === "RK1" ? 0 : null;
};
const FURN: Record<string, RentalListing["furnishing"]> = { FULLY_FURNISHED: "FULL", SEMI_FURNISHED: "SEMI", NOT_FURNISHED: "NONE" };

interface NoBrokerRaw {
  id?: string; rent?: number; propertySize?: number; type?: string; buildingType?: string; latitude?: number; longitude?: number;
  furnishing?: string; inactiveReason?: string | null; lastUpdateDate?: number; sharedAccomodation?: boolean; propertyType?: string;
}

/** Listings embedded in a NoBroker "flats for rent in …" page. */
export function parseNoBrokerRentPage(html: string): RentalListing[] {
  const marker = '"listPageProperties":';
  const i = html.indexOf(marker);
  if (i < 0) return [];
  let raw: NoBrokerRaw[];
  try {
    raw = JSON.parse(sliceJsonArray(html, i + marker.length) ?? "[]");
  } catch {
    return [];
  }
  const out: RentalListing[] = [];
  for (const x of raw) {
    if (!x.id || x.propertyType !== "RENT" || x.buildingType !== "AP" || x.sharedAccomodation) continue;
    if (x.inactiveReason === "INCORRECT") continue;
    const rent = Number(x.rent), size = Number(x.propertySize);
    if (!(rent >= 3000 && rent <= 500_000 && size >= 300 && size <= 8000)) continue;
    const perSqft = rent / size;
    if (perSqft < 5 || perSqft > 200) continue;
    if (!Number.isFinite(x.latitude) || !Number.isFinite(x.longitude)) continue;
    out.push({
      id: `nobroker:${x.id}`,
      rent,
      sizeSqft: size,
      bhk: BHK(x.type),
      lat: x.latitude!,
      lng: x.longitude!,
      furnishing: FURN[x.furnishing ?? ""] ?? null,
      letOut: /^LETOUT/.test(x.inactiveReason ?? ""),
      updatedAt: x.lastUpdateDate ? new Date(x.lastUpdateDate).toISOString() : null,
    });
  }
  return out;
}

/** The JSON array starting at `from` (bracket-matched, string-aware). */
function sliceJsonArray(s: string, from: number): string | null {
  let depth = 0, inStr = false, esc = false;
  for (let j = from; j < s.length; j++) {
    const ch = s[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return s.slice(from, j + 1);
  }
  return null;
}

export type RentConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface CorridorRent {
  /** ₹ per sq.ft per month */
  rentSqftMedian: number;
  rentSqftP25: number;
  rentSqftP75: number;
  listings: number;
  letOut: number;
  /** Typical monthly rent by bedrooms, where at least 3 listings */
  byBhk: { bhk: number; medianRent: number; listings: number }[];
  radiusKm: number;
  confidence: RentConfidence;
  /** % a year, against `priceSqft` */
  grossYield: number | null;
  grossYieldRange: [number, number] | null;
  priceSqft: number | null;
}

const ENOUGH = 15;
const MIN = 8;
export const rentConfidence = (n: number): RentConfidence | null => (n >= 40 ? "HIGH" : n >= ENOUGH ? "MEDIUM" : n >= MIN ? "LOW" : null);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function measureRent(centre: { lat: number; lng: number }, listings: RentalListing[], priceSqft: number | null): CorridorRent | null {
  const usable = listings.filter((l) => l.furnishing !== "FULL");
  const withKm = usable.map((l) => ({ l, km: haversineKm(centre.lat, centre.lng, l.lat, l.lng) }));
  for (let i = 0; i < RADII_KM.length; i++) {
    const radiusKm = RADII_KM[i];
    const inside = withKm.filter((x) => x.km <= radiusKm).map((x) => x.l);
    if (inside.length < ENOUGH && i < RADII_KM.length - 1) continue;
    const confidence = rentConfidence(inside.length);
    if (!confidence) return null;
    const perSqft = inside.map((l) => l.rent / l.sizeSqft).sort((a, b) => a - b);
    const med = quantile(perSqft, 0.5), p25 = quantile(perSqft, 0.25), p75 = quantile(perSqft, 0.75);
    const byBhk = [1, 2, 3, 4]
      .map((b) => {
        const rents = inside.filter((l) => l.bhk === b).map((l) => l.rent).sort((a, c) => a - c);
        return rents.length >= 3 ? { bhk: b, medianRent: Math.round(quantile(rents, 0.5) / 500) * 500, listings: rents.length } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    const y = (rent: number) => (priceSqft ? r1(((rent * 12) / priceSqft) * 100) : null);
    return {
      rentSqftMedian: r1(med),
      rentSqftP25: r1(p25),
      rentSqftP75: r1(p75),
      listings: inside.length,
      letOut: inside.filter((l) => l.letOut).length,
      byBhk,
      radiusKm,
      confidence,
      grossYield: y(med),
      grossYieldRange: priceSqft ? [y(p25)!, y(p75)!] : null,
      priceSqft,
    };
  }
  return null;
}
