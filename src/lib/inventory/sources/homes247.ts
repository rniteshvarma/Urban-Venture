/**
 * Homes247 project pages → InventoryRecord.
 *
 * The page embeds its data as Angular transfer state (JSON with &q; for
 * quotes): project details, BHK-wise sizes and prices, amenities, approvals,
 * images and the builder profile. Per-unit prices there are sometimes
 * inconsistent with the project's own price range, so a unit price outside
 * that range is withheld rather than shown. Only projects with a TG-RERA
 * number are kept (the caller also checks it against TG-RERA's own map).
 * Pure: tested in sources.test.ts.
 */
import { describe as describeRecord, type InventoryRecord, type InventoryType, type InventoryUnit } from "../record";
import { parseMonthYear, parsePriceLakh, reraNumbersIn, stripTags } from "./text";
import type { ParseResult } from "./roofandfloor";

const IMG = "https://img-db.homes247.in/images/";
/** Stock placeholders Homes247 shows when a project has no real image. */
const PLACEHOLDER = /^(coverimg|masterplan|noimage|no-image)\.|no ?floor ?plan|default/i;
const real = (n: string | null | undefined): n is string => !!n && !PLACEHOLDER.test(n.trim());

const TYPE: Record<string, InventoryType> = { apartments: "Apartment", apartment: "Apartment", flats: "Apartment", villas: "Villa", villa: "Villa", plots: "Plots", plot: "Plots", commercial: "Commercial" };

/** The transfer-state JSON object, or null. */
export function transferState(html: string): Record<string, unknown> | null {
  const m = html.match(/<script id="[^"]*state[^"]*" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].replace(/&q;/g, '"').replace(/&s;/g, "'").replace(/&l;/g, "<").replace(/&g;/g, ">").replace(/&a;/g, "&"));
  } catch {
    return null;
  }
}

const first = <T>(state: Record<string, unknown>, prefix: string, field: string): T | null => {
  const k = Object.keys(state).find((x) => x.startsWith(prefix));
  const v = k ? (state[k] as Record<string, unknown>)?.[field] : null;
  return Array.isArray(v) && v.length ? (v[0] as T) : null;
};

interface Details {
  propertyName: string; BuilderName: string; locality_name: string; propertyType: string; RERA_ID: string | null; Status: string;
  PossessionDate: string | null; latitude: string; longitude: string; min_price: string; max_price: string; dimension: string | null;
  total_apartments: string | null; masterImgPath: string | null; updateddate: string | null; images?: { name: string }[];
}
interface AmenBanks { Amenities_Details?: { Name: string }[]; Approvals_Details?: { Name: string }[]; BHK_Details?: { BHK: string; Areaconverted: string; Price: string; FloorImage: string | null }[]; images?: { name: string }[] }

/** "Founded by … in 1986", "established in 1994", "since 1999" → year */
export function foundingYear(text: string): number | null {
  // Within one sentence; an initial ("A. Rao") doesn't end it.
  const m = text.match(/\b(?:founded|established|incorporated|inception|started)\b(?:[^.]|\b[A-Z]\.){0,80}?\b(19[5-9]\d|20[0-2]\d)\b/i) ?? text.match(/\bsince\s+(19[5-9]\d|20[0-2]\d)\b/i);
  return m ? Number(m[1]) : null;
}

export function parseHomes247(html: string, url: string, opts: { accessed: string; established?: (developer: string) => number | null }): ParseResult {
  const id = url.match(/-(\d+)$/)?.[1];
  const key = `homes247:${id ?? url}`;
  const state = transferState(html);
  if (!state) return { ok: false, key, reason: "no page data" };
  const d = first<Details>(state, "prop_new_test_", "details");
  if (!d) return { ok: false, key, reason: "no project details" };
  const propertyType = TYPE[(d.propertyType ?? "").toLowerCase().trim()];
  if (!propertyType) return { ok: false, key, reason: `unhandled property type "${d.propertyType}"` };
  const reraNumbers = reraNumbersIn(d.RERA_ID ?? "");
  const extra = first<AmenBanks>(state, "amen_banks_test_", "details");
  const builder = first<{ Builder_details?: { builderdesc?: string }[] }>(state, "prop_desc_test_", "descriptions");

  const low = Number(d.min_price) / 100_000 || 0;
  const high = Number(d.max_price) / 100_000 || low;
  const isPlot = propertyType === "Plots";
  const units: InventoryUnit[] = (extra?.BHK_Details ?? []).map((b) => {
    const size = Number(b.Areaconverted) || null;
    let price = parsePriceLakh(b.Price);
    let note: string | null = null;
    if (price != null && low > 0 && (price < low * 0.95 || price > high * 1.05)) {
      price = null;
      note = "Unit price withheld: outside the project's own listed range";
    }
    const bhk = b.BHK?.match(/(\d+(?:\.\d+)?)\s*BHK/i);
    const sqyd = isPlot && size ? Math.round((size / 9) * 10) / 10 : null;
    return {
      label: bhk ? `${bhk[1]} BHK` : isPlot ? "Plot" : (b.BHK || "Unit").trim(),
      category: isPlot ? "PLOT" : propertyType === "Villa" ? "VILLA" : propertyType === "Commercial" ? "COMMERCIAL" : "APARTMENT",
      bedrooms: bhk ? Number(bhk[1]) : null,
      carpetSqFt: null,
      builtUpSqFt: isPlot ? null : size,
      plotSqYd: sqyd,
      priceLakh: price,
      ratePerSqFt: !isPlot && size && price ? Math.round((price * 100_000) / size) : null,
      ratePerSqYd: isPlot && sqyd && price ? Math.round((price * 100_000) / sqyd) : null,
      priceNote: note,
    };
  });

  const ready = /ready/i.test(d.Status);
  const possession = parseMonthYear(d.PossessionDate);
  const lat = Number(d.latitude), lng = Number(d.longitude);
  const imageNames = [...new Set([...(d.images ?? []), ...(extra?.images ?? [])].map((i) => i.name).filter(real))];
  const dev = d.BuilderName?.trim();
  if (!dev) return { ok: false, key, reason: "no developer" };
  const acres = d.dimension ? Number(d.dimension) : null;
  const units0 = Number(d.total_apartments) || null;

  const rec: Omit<InventoryRecord, "description"> = {
    key,
    name: d.propertyName.trim(),
    developer: dev,
    developerEstablished: opts.established?.(dev) ?? foundingYear(stripTags(builder?.Builder_details?.[0]?.builderdesc ?? "")),
    propertyType,
    listingKind: "PROJECT",
    locality: d.locality_name?.trim() || "Hyderabad",
    subLocality: null,
    address: null,
    lat: Number.isFinite(lat) && lat > 0 ? lat : null,
    lng: Number.isFinite(lng) && lng > 0 ? lng : null,
    coordPrecision: Number.isFinite(lat) && lat > 0 ? "exact" : null,
    reraNumbers,
    reraUrl: null,
    landAcres: acres && acres > 0 && acres < 2000 ? acres : null,
    towers: null,
    floors: null,
    plots: isPlot ? units0 : null,
    totalUnits: units0,
    possessionRera: null,
    possessionTarget: ready ? null : possession,
    status: ready ? "READY" : /under construction|new launch|up ?coming/i.test(d.Status) ? "UNDER_CONSTRUCTION" : "UNKNOWN",
    priceMinLakh: Math.round(low * 100) / 100,
    priceMaxLakh: Math.round(high * 100) / 100,
    units,
    amenities: [...new Set((extra?.Amenities_Details ?? []).map((a) => a.Name.trim()).filter(Boolean))],
    images: imageNames.map((n) => `${IMG}uploadPropertyImgs/${encodeURIComponent(n)}`),
    masterPlans: real(d.masterImgPath) ? [`${IMG}masterImgs/${encodeURIComponent(d.masterImgPath)}`] : [],
    floorPlans: [...new Set((extra?.BHK_Details ?? []).map((b) => b.FloorImage).filter(real))].map((n) => `${IMG}uploadBHKImgs/${encodeURIComponent(n)}`),
    paymentPlans: [],
    landmarks: [],
    litigation: null,
    approvals: [...new Set((extra?.Approvals_Details ?? []).map((a) => a.Name.trim()).filter(Boolean))],
    sources: [{ name: "homes247.in", url, accessed: opts.accessed }],
    flags: [],
  };
  if (units.some((u) => u.priceNote?.startsWith("Unit price withheld"))) rec.flags.push("UNIT_PRICE_WITHHELD");
  if (!reraNumbers.length) return { ok: false, key, reason: "no TG-RERA number on the page" };
  return { ok: true, record: { ...rec, description: describeRecord(rec) } };
}
