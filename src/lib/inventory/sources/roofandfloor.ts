/**
 * RoofandFloor project pages → InventoryRecord.
 *
 * Reads the JSON-LD block (name, coordinates, price range, developer), the
 * "Essential Information" spec items, the "Price and Configurations" table,
 * amenities, gallery and floor-plan images. Floor-plan file names contain
 * spaces, so they are URL-encoded (the first collector cut them at the space,
 * which broke most floor-plan links). Pure: tested in sources.test.ts.
 */
import { describe as describeRecord, type InventoryRecord, type InventoryType, type InventoryUnit } from "../record";
import { decodeEntities, parsePriceLakh, parseMonthYear, reraNumbersIn, stripTags } from "./text";

const BASE = "https://www.roofandfloor.com/";

export type ParseResult = { ok: true; record: InventoryRecord } | { ok: false; reason: string; key: string };

const TYPE: Record<string, InventoryType> = {
  flats: "Apartment", apartments: "Apartment", apartment: "Apartment",
  villas: "Villa", villa: "Villa", "row houses": "Villa", "independent houses": "Villa", "independent house": "Villa",
  plots: "Plots", plot: "Plots", "villa plots": "Plots",
  commercial: "Commercial", "commercial space": "Commercial", office: "Commercial", "office space": "Commercial", shops: "Commercial", retail: "Commercial",
};

export function specItems(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/pd-spec-lbl">([^<]+)<\/span>\s*<span class="pd-spec-val[^"]*">([\s\S]*?)<\/span>\s*<\/div>/g)) {
    out[decodeEntities(m[1]).trim()] = stripTags(m[2]);
  }
  return out;
}

function jsonLd(html: string): Record<string, unknown> | null {
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      const types = ([] as unknown[]).concat(j["@type"]);
      if (types.includes("ApartmentComplex") || types.includes("Product") || types.includes("Residence")) return j;
    } catch {
      /* not JSON */
    }
  }
  return null;
}

const num = (s: string | undefined) => {
  const m = s?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** "1225 - 1245" / "1485 sq.ft." → [min, max] */
const range = (s: string): [number, number] | null => {
  const xs = [...s.replace(/,/g, "").matchAll(/\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  return xs.length ? [xs[0], xs[xs.length - 1]] : null;
};

/** "17 Acres" | "4840 Sq.Yd" | "1.2 Acre" → acres */
function acresOf(s: string | undefined): number | null {
  if (!s) return null;
  const v = num(s);
  if (v == null) return null;
  if (/acre/i.test(s)) return v;
  if (/sq\.?\s*yd|yard/i.test(s)) return Math.round((v / 4840) * 100) / 100;
  if (/sq\.?\s*ft/i.test(s)) return Math.round((v / 43560) * 100) / 100;
  if (/hect/i.test(s)) return Math.round(v * 2.471 * 100) / 100;
  return null;
}

function unitCategory(label: string, type: InventoryType): InventoryUnit["category"] {
  if (/plot/i.test(label)) return "PLOT";
  if (/villa|row ?house|independent/i.test(label)) return "VILLA";
  if (/office/i.test(label)) return "OFFICE";
  if (/shop|retail|commercial|showroom/i.test(label)) return "COMMERCIAL";
  if (/flat|apartment|bhk/i.test(label)) return type === "Villa" ? "VILLA" : type === "Commercial" ? "COMMERCIAL" : "APARTMENT";
  return type === "Plots" ? "PLOT" : type === "Villa" ? "VILLA" : type === "Commercial" ? "COMMERCIAL" : "APARTMENT";
}

/** Rows of the "Price and Configurations" table → units at each listed end of the size/price range. */
export function configUnits(html: string, type: InventoryType): InventoryUnit[] {
  const table = html.match(/<table class="pd-config-table">([\s\S]*?)<\/table>/)?.[1];
  if (!table) return [];
  const units: InventoryUnit[] = [];
  for (const tr of table.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
    if (cells.length < 3) continue;
    const [label, sizeCell, priceCell] = cells;
    const sizes = range(sizeCell);
    const prices = priceCell.split(/\s+-\s+/).map(parsePriceLakh);
    const category = unitCategory(label, type);
    const bhk = label.match(/(\d+(?:\.\d+)?)\s*BHK/i);
    const bedrooms = bhk ? Number(bhk[1]) : null;
    const shortLabel = bhk ? `${bhk[1]} BHK` : category === "PLOT" ? "Plot" : label.replace(/\s+/g, " ").trim();
    const ends: [number | null, number | null][] = sizes
      ? sizes[0] === sizes[1]
        ? [[sizes[0], prices[0] ?? null]]
        : [[sizes[0], prices[0] ?? null], [sizes[1], prices[prices.length - 1] ?? null]]
      : [[null, prices[0] ?? null]];
    for (const [sqft, price] of ends) {
      const isPlot = category === "PLOT";
      const sqyd = isPlot && sqft ? Math.round((sqft / 9) * 10) / 10 : null;
      units.push({
        label: shortLabel,
        category,
        bedrooms,
        carpetSqFt: null,
        builtUpSqFt: isPlot ? null : sqft,
        plotSqYd: sqyd,
        priceLakh: price,
        ratePerSqFt: !isPlot && sqft && price ? Math.round((price * 100_000) / sqft) : null,
        ratePerSqYd: isPlot && sqyd && price ? Math.round((price * 100_000) / sqyd) : null,
        priceNote: price == null ? "Price on request" : null,
      });
    }
  }
  return units;
}

export function parseRoofAndFloor(html: string, url: string, opts: { accessed: string; established?: (developer: string) => number | null }): ParseResult {
  const id = url.match(/\/(\d+)\/?$/)?.[1];
  const key = `roofandfloor:${id ?? url}`;
  if (!id) return { ok: false, key, reason: "no project id in URL" };
  const ld = jsonLd(html);
  const spec = specItems(html);
  const name = stripTags(html.match(/<h1 class="pd-project-name">([\s\S]*?)<\/h1>/)?.[1] ?? "") || String(ld?.name ?? "").trim();
  if (!name) return { ok: false, key, reason: "no project name" };
  const typeWord = (spec["Property Type"] ?? "").toLowerCase().split(/[,&/]/)[0].trim();
  const propertyType = TYPE[typeWord];
  if (!propertyType) return { ok: false, key, reason: `unhandled property type "${spec["Property Type"] ?? ""}"` };

  const offers = (ld?.offers ?? {}) as { lowPrice?: string; highPrice?: string; seller?: { name?: string } };
  const developer = (offers.seller?.name ?? stripTags(html.match(/pd-builder-name">([\s\S]*?)<\/span>/)?.[1] ?? "").replace(/^By\s+/i, "")).trim();
  if (!developer) return { ok: false, key, reason: "no developer" };

  const geo = (ld?.geo ?? {}) as { latitude?: string; longitude?: string };
  const lat = geo.latitude ? Number(geo.latitude) : null;
  const lng = geo.longitude ? Number(geo.longitude) : null;
  const locality = (spec["Project Location"] ?? "").replace(/,\s*Hyderabad\s*$/i, "").trim();
  const address = stripTags(html.match(/Address:\s*([^<]+)</)?.[1] ?? "").replace(/\.\s*$/, "") || null;

  const possession = spec["Possession"] ?? "";
  const ready = /ready/i.test(possession);
  const target = ready ? null : parseMonthYear(possession);
  const units = configUnits(html, propertyType);
  const priced = units.map((u) => u.priceLakh).filter((x): x is number => x != null && x > 0);
  const low = offers.lowPrice ? Number(offers.lowPrice) / 100_000 : null;
  const high = offers.highPrice ? Number(offers.highPrice) / 100_000 : null;
  const priceMinLakh = Math.round((priced.length ? Math.min(...priced) : low ?? 0) * 100) / 100;
  const priceMaxLakh = Math.round((priced.length ? Math.max(...priced) : high ?? low ?? 0) * 100) / 100;

  const gallery = [...new Set([...html.matchAll(/project\/\d+\/gallery\/[^"'\s<>)?]+/g)].map((m) => m[0]))].filter((p) => p.startsWith(`project/${id}/`));
  const floorPlans = [...html.matchAll(/data-fp-img="([^"]+)"/g)].map((m) => BASE + encodeURI(decodeEntities(m[1])));
  const masterPlans = [...new Set([...html.matchAll(/project\/\d+\/(?:masterplan|master-plan|master_plan)\/[^"'\s<>)?]+/gi)].map((m) => BASE + encodeURI(m[0])))];
  // The visible amenity tiles plus the full list in the "all amenities" pop-up.
  const amenities = [
    ...new Set(
      [...html.matchAll(/pd-amenity-item">[\s\S]*?<span>([^<]+)<\/span>/g), ...html.matchAll(/data-amen-name="([^"]+)"/g)].map((m) => decodeEntities(m[1]).trim()).filter(Boolean),
    ),
  ];
  const reraNumbers = reraNumbersIn(spec["RERA No"] ?? spec["RERA No."] ?? spec["RERA Number"] ?? "");
  const blocks = num(spec["Total Blocks"]);

  const rec: Omit<InventoryRecord, "description"> = {
    key,
    name,
    developer,
    developerEstablished: opts.established?.(developer) ?? null,
    propertyType,
    listingKind: "PROJECT",
    locality: locality || "Hyderabad",
    subLocality: null,
    address,
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
    coordPrecision: lat != null && lng != null ? "exact" : null,
    reraNumbers,
    reraUrl: null,
    landAcres: acresOf(spec["Total Land Area"]),
    towers: blocks,
    floors: spec["Total Floors"] || null,
    plots: propertyType === "Plots" ? num(spec["Total Units"]) : null,
    totalUnits: num(spec["Total Units"]),
    possessionRera: null,
    possessionTarget: target,
    status: ready ? "READY" : target ? "UNDER_CONSTRUCTION" : "UNKNOWN",
    priceMinLakh,
    priceMaxLakh,
    units,
    amenities,
    images: gallery.map((p) => BASE + p),
    masterPlans,
    floorPlans,
    paymentPlans: [],
    landmarks: [],
    litigation: null,
    approvals: [],
    sources: [{ name: "roofandfloor.com", url, accessed: opts.accessed }],
    flags: [],
  };
  return { ok: true, record: { ...rec, description: describeRecord(rec) } };
}
