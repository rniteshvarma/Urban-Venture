/**
 * 1acre.in land and plot listings → InventoryRecord (listingKind LAND_LISTING).
 *
 * The page streams its data as React Server Component rows
 * (self.__next_f.push) — "id:json" lines whose objects point at each other
 * with "$xx" references. We read the listing object and its location
 * divisions; the seller's identity is never read or stored (enquiries come to
 * us). Strict filters are applied by the caller (see acceptLandListing).
 * Pure: tested in sources.test.ts.
 */
import { describe as describeRecord, type InventoryRecord, type InventoryUnit } from "../record";
import type { ParseResult } from "./roofandfloor";

const SQYD_PER_ACRE = 4840;

/** The RSC rows of a Next.js page, keyed by their hex id. */
export function rscRows(html: string): Map<string, unknown> {
  const text = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)]
    .map((m) => {
      try {
        return JSON.parse(`"${m[1]}"`) as string;
      } catch {
        return "";
      }
    })
    .join("");
  const rows = new Map<string, unknown>();
  for (const line of text.split(/\n(?=[0-9a-f]{1,4}:)/)) {
    const m = line.match(/^([0-9a-f]{1,4}):([\[{][\s\S]*)$/);
    if (!m) continue;
    try {
      rows.set(m[1], JSON.parse(m[2]));
    } catch {
      /* not a data row */
    }
  }
  return rows;
}

const deref = (rows: Map<string, unknown>, v: unknown): unknown => (typeof v === "string" && /^\$[0-9a-f]+$/.test(v) ? rows.get(v.slice(1)) : v);

export interface OneAcreListing {
  id: number;
  kind: "land" | "plot";
  totalPriceLakh: number | null;
  acres: number | null;
  sqyd: number | null;
  ratePerAcreLakh: number | null;
  ratePerSqYd: number | null;
  lat: number | null;
  lng: number | null;
  isExact: boolean;
  status: string;
  verification: string;
  basicVerified: boolean;
  physicallyVerified: boolean;
  createdAt: string | null;
  village: string | null;
  mandal: string | null;
  district: string | null;
  layoutType: string | null;
  lpNumber: string | null;
  approvalAuthority: string | null;
  lrsObtained: boolean | null;
  surveyNumber: string | null;
  approachRoad: boolean | null;
  images: string[];
}

export function readOneAcre(html: string, url: string): OneAcreListing | null {
  const slug = url.split("/").pop() ?? "";
  const rows = rscRows(html);
  let obj: Record<string, unknown> | null = null;
  for (const v of rows.values()) {
    if (v && typeof v === "object" && !Array.isArray(v) && (v as { slug?: string }).slug === slug && "total_price" in (v as object)) {
      obj = v as Record<string, unknown>;
      break;
    }
  }
  if (!obj) return null;
  const kind = "plot_media" in obj || "total_plot_size" in obj ? "plot" : "land";
  const divisions = ((deref(rows, obj.lgd_division_info) ?? deref(rows, obj.division_info)) as unknown[] | undefined ?? [])
    .map((d) => deref(rows, d) as { name?: string; division_type?: string } | undefined)
    .filter(Boolean) as { name?: string; division_type?: string }[];
  const div = (t: string) => divisions.find((d) => d.division_type === t)?.name ?? null;
  const num = (x: unknown) => (x == null || x === "" ? null : Number(x));
  const lat = num(obj.lat), lng = num(obj.long);

  let acres: number | null = null, sqyd: number | null = null, totalLakh: number | null = null, perAcre: number | null = null, perSqYd: number | null = null;
  if (kind === "land") {
    // Land prices are given in lakh (total and per acre).
    totalLakh = num(obj.total_price);
    perAcre = num(obj.price_per_acre);
    const size = deref(rows, obj.land_size) as { total_land_size_in_acres?: unknown } | undefined;
    const a = deref(rows, size?.total_land_size_in_acres) as { acres?: number; guntas?: number; cents?: number } | undefined;
    acres = a && (a.acres != null || a.guntas != null || a.cents != null) ? (a.acres ?? 0) + (a.guntas ?? 0) / 40 + (a.cents ?? 0) / 100 : num(obj.total_land_size);
    sqyd = acres != null ? Math.round(acres * SQYD_PER_ACRE) : null;
  } else {
    // Plot prices are in rupees; size is in the stated unit.
    const rupees = num(obj.total_price);
    totalLakh = rupees != null ? Math.round((rupees / 100_000) * 100) / 100 : null;
    const size = num(obj.total_plot_size);
    const unit = String(obj.total_plot_size_unit ?? "square_yard");
    sqyd = size == null ? null : unit === "square_yard" ? size : unit === "square_feet" ? size / 9 : unit === "acre" ? size * SQYD_PER_ACRE : unit === "square_meter" ? size * 1.19599 : null;
    sqyd = sqyd != null ? Math.round(sqyd * 10) / 10 : null;
    acres = sqyd != null ? Math.round((sqyd / SQYD_PER_ACRE) * 10000) / 10000 : null;
    perSqYd = num(obj.price_per_square_yard);
  }

  const images = [...new Set([...html.matchAll(/https:\/\/media\.production\.1acre\.in\/(?:land|plot)_images\/(?!webp\/)[^"'\s\\]+\.(?:jpe?g|png)/gi)].map((m) => m[0]))];
  return {
    id: Number(obj.id),
    kind,
    totalPriceLakh: totalLakh,
    acres,
    sqyd,
    ratePerAcreLakh: perAcre,
    ratePerSqYd: perSqYd,
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
    isExact: obj.is_exact === true,
    status: String(obj.status ?? ""),
    verification: String(obj.verification_status ?? ""),
    basicVerified: obj.is_basic_verified === true,
    physicallyVerified: obj.is_physically_verified === true,
    createdAt: (obj.created_at as string) ?? null,
    village: div("village"),
    mandal: div("mandal"),
    district: div("district"),
    layoutType: (obj.layout_type as string) ?? null,
    lpNumber: (obj.lp_number as string) || null,
    approvalAuthority: (obj.approval_authority as string) || null,
    lrsObtained: typeof obj.lrs_obtained === "boolean" ? obj.lrs_obtained : null,
    surveyNumber: (obj.survey_number as string) || null,
    approachRoad: typeof obj.approach_road === "boolean" ? obj.approach_road : typeof obj.abutting_road === "boolean" ? obj.abutting_road : null,
    images,
  };
}

/**
 * The strict filters the user chose for land listings: active, approved and
 * basic-verified by 1acre, posted within `maxAgeDays`, with a price, an area
 * and a location. Returns the reason a listing is rejected, or null.
 */
export function landRejection(l: OneAcreListing, now: Date, maxAgeDays = 365): string | null {
  if (l.status !== "active") return `status ${l.status || "unknown"}`;
  if (l.verification !== "approved" || !l.basicVerified) return "not verified by 1acre";
  if (!l.createdAt) return "no posting date";
  if ((now.getTime() - new Date(l.createdAt).getTime()) / 86_400_000 > maxAgeDays) return "posted more than 12 months ago";
  if (!l.totalPriceLakh || l.totalPriceLakh <= 0) return "no price";
  if (!l.acres || l.acres <= 0) return "no area";
  if (l.lat == null || l.lng == null) return "no location";
  return null;
}

const title = (s: string | null) => (s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : s);

export function parseOneAcre(html: string, url: string, opts: { accessed: string; now: Date }): ParseResult {
  const l = readOneAcre(html, url);
  const key = `1acre:${l?.kind ?? "land"}:${l?.id ?? url.split("-").pop()}`;
  if (!l) return { ok: false, key, reason: "no listing data" };
  const why = landRejection(l, opts.now);
  if (why) return { ok: false, key, reason: why };
  const isPlot = l.kind === "plot";
  const price = l.totalPriceLakh!;
  const unit: InventoryUnit = {
    label: isPlot ? "Plot" : "Land",
    category: "LAND",
    bedrooms: null,
    carpetSqFt: null,
    builtUpSqFt: null,
    plotSqYd: l.sqyd,
    acres: l.acres,
    priceLakh: price,
    ratePerSqYd: l.ratePerSqYd ?? (l.sqyd ? Math.round((price * 100_000) / l.sqyd) : null),
    ratePerAcreLakh: isPlot ? null : l.ratePerAcreLakh ?? (l.acres ? Math.round((price / l.acres) * 100) / 100 : null),
    priceNote: "Asking price",
  };
  const locality = title(l.mandal) ?? title(l.village) ?? "Hyderabad region";
  const sizeLabel = isPlot ? `${Math.round(l.sqyd ?? 0)} sq.yd plot` : `${Number((l.acres ?? 0).toFixed(2))} acre land`;
  const approvals = isPlot
    ? [l.layoutType === "approved" ? `Seller-stated layout: approved${l.approvalAuthority ? ` (${l.approvalAuthority})` : ""}` : null, l.lpNumber ? `LP number ${l.lpNumber}` : null, l.lrsObtained ? "LRS obtained (seller-stated)" : null].filter((x): x is string => !!x)
    : [];
  const rec: Omit<InventoryRecord, "description"> = {
    key,
    name: `${sizeLabel} in ${title(l.village) ?? locality}`,
    developer: "Individual seller",
    developerEstablished: null,
    propertyType: isPlot ? "Plots" : "Land",
    listingKind: "LAND_LISTING",
    locality,
    subLocality: title(l.village),
    address: [title(l.village), title(l.mandal) ? `${title(l.mandal)} mandal` : null, l.district ? `${l.district} district` : null, "Telangana"].filter(Boolean).join(", "),
    lat: l.lat,
    lng: l.lng,
    coordPrecision: l.isExact ? "exact" : "approximate",
    reraNumbers: [],
    reraUrl: null,
    landAcres: l.acres,
    towers: null,
    floors: null,
    plots: null,
    totalUnits: 1,
    possessionRera: null,
    possessionTarget: null,
    status: "READY",
    priceMinLakh: price,
    priceMaxLakh: price,
    units: [unit],
    amenities: [],
    images: [],
    masterPlans: [],
    floorPlans: [],
    paymentPlans: [],
    landmarks: [],
    litigation: null,
    approvals,
    sources: [{ name: "1acre.in", url, accessed: opts.accessed }],
    flags: ["NOT_RERA", ...(l.isExact ? [] : ["LOCATION_APPROXIMATE"]), ...(l.physicallyVerified ? ["SOURCE_SITE_VERIFIED"] : [])],
    postedAt: l.createdAt,
    sourceVerification: l.physicallyVerified ? "Basic and site verification by 1acre" : "Basic verification by 1acre",
  };
  return { ok: true, record: { ...rec, description: describeRecord(rec) } };
}
