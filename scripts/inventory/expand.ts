/**
 * Expand the inventory from downloaded source pages and write
 * prisma/data/hyderabad-inventory.json. Pages are fetched separately (politely,
 * honouring robots.txt) into a folder; this script only reads them.
 *
 *   npx tsx scripts/inventory/expand.ts --pages <dir> [--write] [--h247-clean <file>] [--dump-h247-images <file>]
 *
 *   <dir>/rf-pages/{id}.html         RoofandFloor project pages
 *   <dir>/rf-urls.txt                their URLs
 *   <dir>/h247/pages/{id}.html       Homes247 pages matched to TG-RERA projects
 *   <dir>/h247/cand-urls.txt         their URLs
 *   <dir>/oneacre/pages/{id}.html    1acre land / plot listings
 *   <dir>/oneacre/cands3.txt         their URLs
 *   /tmp/gis.json                    TG-RERA map feed (project numbers + locations)
 *
 * Rules (user decisions, 2026-10-21):
 *  - Area: inside the Regional Ring Road or within 20 km outside it.
 *  - Projects need a TG-RERA number and a listed price. Homes247 projects must
 *    also appear on TG-RERA's own map within 3 km of the page's pin.
 *  - Land listings (1acre): active, verified by 1acre, posted in the last 12
 *    months, priced, with area and location; shown as "not RERA", no seller
 *    details, no seller photos.
 *  - Unit prices outside sane bands, or 2.5× away from the zone median for the
 *    same type, are withheld (never "fixed").
 *  - Duplicates (same RERA number, or same name + developer) are dropped.
 *  - Existing RoofandFloor records keep their data; only broken floor-plan
 *    links and missing amenities are repaired from the fresh page.
 *  - Homes247 watermarks its images, floor plans and master plans, so none
 *    are used unless listed in --h247-clean; by default the record has none.
 */
import fs from "node:fs";
import path from "node:path";
import { classifyZone, distanceToPolylineKm, haversineKm, RRR_POLYGON } from "../../src/lib/infra-intel/geo";
import { describe as describeRecord, type InventoryRecord } from "../../src/lib/inventory/record";
import { zoneFor, ZONES } from "../../src/lib/inventory/zones";
import { parseRoofAndFloor } from "../../src/lib/inventory/sources/roofandfloor";
import { parseHomes247 } from "../../src/lib/inventory/sources/homes247";
import { parseOneAcre } from "../../src/lib/inventory/sources/oneacre";
import { normaliseOrgName } from "../../src/lib/developers/names";

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const PAGES = arg("--pages");
if (!PAGES) throw new Error("--pages <dir> is required");
const WRITE = process.argv.includes("--write");
const DATA = path.join(process.cwd(), "prisma/data/hyderabad-inventory.json");
const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date();

const existing: InventoryRecord[] = JSON.parse(fs.readFileSync(DATA, "utf8"));
const byKey = new Map(existing.map((r) => [r.key, r]));
const established = new Map<string, number>();
for (const r of existing) if (r.developerEstablished) established.set(normaliseOrgName(r.developer), r.developerEstablished);
const est = (dev: string) => established.get(normaliseOrgName(dev)) ?? null;

const gis: { Name_of_Project: string; Application_No: string; lat: number; lng: number }[] = JSON.parse(fs.readFileSync("/tmp/gis.json", "utf8"));
const gisByRera = new Map(gis.filter((g) => g.Application_No).map((g) => [g.Application_No.toUpperCase(), g]));

const report: Record<string, Record<string, number>> = {};
const tally = (src: string, what: string) => {
  report[src] ??= {};
  report[src][what] = (report[src][what] ?? 0) + 1;
};

const inArea = (lat: number, lng: number) => ["INSIDE_RRR", "RRR_BUFFER"].includes(classifyZone(lat, lng));

/** Absolute sanity bands per unit rate. */
const BAND = {
  sqft: [2_000, 40_000] as const, // ₹/sq.ft, apartments, villas, commercial
  sqyd: [2_500, 250_000] as const, // ₹/sq.yd, developer plots and plot listings
  acreLakh: [5, 6_000] as const, // ₹ lakh per acre, land
};

function sanitiseUnits(r: InventoryRecord, zoneMedian: (r: InventoryRecord) => number | null): void {
  const med = zoneMedian(r);
  let withheld = 0;
  // Within one project, units of the same kind are priced at similar rates. A
  // spread over 1.6× means the source's unit prices don't hang together, so
  // none of them are shown.
  const ownRates = r.units.filter((u) => u.priceLakh != null && u.category !== "LAND").map((u) => u.ratePerSqFt ?? u.ratePerSqYd).filter((x): x is number => !!x);
  if (ownRates.length >= 2 && Math.max(...ownRates) / Math.min(...ownRates) > 1.6) {
    for (const u of r.units) if (u.category !== "LAND") Object.assign(u, { priceLakh: null, ratePerSqFt: null, ratePerSqYd: null, priceNote: "Price withheld: the source's unit prices are inconsistent" });
    r.flags = [...new Set([...r.flags, "UNIT_PRICE_WITHHELD", "SOURCE_PRICES_INCONSISTENT"])];
  }
  for (const u of r.units) {
    if (u.priceLakh == null) continue;
    const rate = u.ratePerSqFt ?? u.ratePerSqYd ?? null;
    const [lo, hi] = u.ratePerSqFt != null ? BAND.sqft : BAND.sqyd;
    let bad = rate != null && (rate < lo || rate > hi);
    if (u.category === "LAND" && u.ratePerAcreLakh != null) bad = u.ratePerAcreLakh < BAND.acreLakh[0] || u.ratePerAcreLakh > BAND.acreLakh[1];
    else if (!bad && med && rate && (rate > med * 2.5 || rate < med / 2.5)) bad = true;
    if (bad) {
      u.priceLakh = null;
      u.ratePerSqFt = null;
      u.ratePerSqYd = null;
      u.priceNote = "Price withheld: far outside the range for this area";
      withheld++;
    }
  }
  if (withheld) r.flags = [...new Set([...r.flags, "UNIT_PRICE_WITHHELD"])];
  const priced = r.units.map((u) => u.priceLakh).filter((x): x is number => x != null && x > 0);
  if (priced.length) {
    r.priceMinLakh = Math.min(...priced);
    r.priceMaxLakh = Math.max(...priced);
  }
}

/** Drop a pin that sits far from the zone its own locality names. */
function checkPin(r: InventoryRecord): void {
  if (r.lat == null || r.lng == null || r.listingKind === "LAND_LISTING") return;
  const named = zoneFor(r.locality, null, null);
  if (!named) return;
  const z = ZONES.find((x) => x.name === named)!;
  if (haversineKm(r.lat, r.lng, z.lat, z.lng) > 18) {
    r.lat = null;
    r.lng = null;
    r.coordPrecision = null;
    r.flags = [...new Set([...r.flags, "PIN_REMOVED_LOCALITY_MISMATCH"])];
  }
}

/** Where to test the area rule: the pin, else the locality's zone centre. */
function areaPoint(r: InventoryRecord): { lat: number; lng: number } | null {
  if (r.lat != null && r.lng != null) return { lat: r.lat, lng: r.lng };
  const named = zoneFor(r.locality, null, null);
  const z = named ? ZONES.find((x) => x.name === named) : null;
  return z ? { lat: z.lat, lng: z.lng } : null;
}

const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
const urlsIn = (f: string) => (read(f) ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

// ── collect candidates ──────────────────────────────────────────────────────
const candidates: InventoryRecord[] = [];
let repaired = 0;

for (const url of urlsIn(path.join(PAGES, "rf-urls.txt"))) {
  const id = url.split("/").pop()!;
  const html = read(path.join(PAGES, "rf-pages", `${id}.html`));
  if (!html) {
    tally("roofandfloor", "page not downloaded");
    continue;
  }
  const res = parseRoofAndFloor(html, url, { accessed: TODAY, established: est });
  if (!res.ok) {
    tally("roofandfloor", `rejected: ${res.reason}`);
    continue;
  }
  const old = byKey.get(res.record.key);
  if (old) {
    // Repair what the first collector got wrong; keep everything else.
    const fp = res.record.floorPlans;
    const amen = res.record.amenities;
    if (fp.length && JSON.stringify(fp) !== JSON.stringify(old.floorPlans)) {
      old.floorPlans = fp;
      repaired++;
    }
    if (amen.length > old.amenities.length) old.amenities = amen;
    tally("roofandfloor", "existing (checked)");
    continue;
  }
  candidates.push(res.record);
}

const h247Images: Record<string, string[]> = {};
const h247Clean: Record<string, string[]> = arg("--h247-clean") ? JSON.parse(fs.readFileSync(arg("--h247-clean")!, "utf8")) : {};
for (const url of urlsIn(path.join(PAGES, "h247", "cand-urls.txt"))) {
  const id = url.split("-").pop()!;
  const html = read(path.join(PAGES, "h247", "pages", `${id}.html`));
  if (!html) {
    tally("homes247", "page not downloaded");
    continue;
  }
  const res = parseHomes247(html, url, { accessed: TODAY, established: est });
  if (!res.ok) {
    tally("homes247", `rejected: ${res.reason}`);
    continue;
  }
  const r = res.record;
  // The RERA number must be on TG-RERA's map, at (about) the same place.
  const g = r.reraNumbers.map((n) => gisByRera.get(n)).find(Boolean);
  if (!g) {
    tally("homes247", "rejected: RERA number not on TG-RERA's map");
    continue;
  }
  if (r.lat == null || r.lng == null || haversineKm(r.lat, r.lng, g.lat, g.lng) > 3) {
    tally("homes247", "rejected: pin more than 3 km from TG-RERA's location");
    continue;
  }
  h247Images[r.key] = [...r.images];
  // Homes247 watermarks its images (checked by eye, 2026-10-21), so none are
  // used — not even floor or master plans — unless listed as clean.
  const clean = new Set(h247Clean[r.key] ?? []);
  r.images = r.images.filter((u) => clean.has(u));
  r.floorPlans = r.floorPlans.filter((u) => clean.has(u));
  r.masterPlans = r.masterPlans.filter((u) => clean.has(u));
  if (!r.images.length) r.flags = [...new Set([...r.flags, "NO_CLEAN_IMAGES"])];
  r.reraUrl = null;
  candidates.push(r);
}

for (const url of urlsIn(path.join(PAGES, "oneacre", "cands3.txt"))) {
  const id = url.split("-").pop()!;
  const html = read(path.join(PAGES, "oneacre", "pages", `${id}.html`));
  if (!html) {
    tally("1acre", "page not downloaded");
    continue;
  }
  const res = parseOneAcre(html, url, { accessed: TODAY, now: NOW });
  if (!res.ok) {
    tally("1acre", `rejected: ${res.reason}`);
    continue;
  }
  candidates.push(res.record);
}

// ── validate, de-duplicate ──────────────────────────────────────────────────
const seenRera = new Set(existing.flatMap((r) => r.reraNumbers.map((n) => n.toUpperCase())));
const seenName = new Set(existing.map((r) => `${normaliseOrgName(r.name)}|${normaliseOrgName(r.developer)}`));
const accepted: InventoryRecord[] = [];
const src = (r: InventoryRecord) => r.key.split(":")[0];

for (const r of candidates) {
  // Re-runs: a listing already in the dataset is kept as it is.
  if (byKey.has(r.key)) {
    tally(src(r), "already listed");
    continue;
  }
  checkPin(r);
  const p = areaPoint(r);
  if (!p) {
    tally(src(r), "rejected: no location");
    continue;
  }
  if (!inArea(p.lat, p.lng)) {
    tally(src(r), "rejected: more than 20 km outside the RRR");
    continue;
  }
  if (r.listingKind !== "LAND_LISTING") {
    if (!r.reraNumbers.length) {
      tally(src(r), "rejected: no TG-RERA number");
      continue;
    }
    if (!(r.priceMinLakh > 0)) {
      tally(src(r), "rejected: no listed price");
      continue;
    }
    if (r.reraNumbers.some((n) => seenRera.has(n.toUpperCase()))) {
      tally(src(r), "duplicate (same RERA number)");
      continue;
    }
    const nk = `${normaliseOrgName(r.name)}|${normaliseOrgName(r.developer)}`;
    if (seenName.has(nk)) {
      tally(src(r), "duplicate (same name and developer)");
      continue;
    }
    r.reraNumbers.forEach((n) => seenRera.add(n.toUpperCase()));
    seenName.add(nk);
    if (r.reraNumbers.some((n) => gisByRera.has(n.toUpperCase()))) r.flags = [...new Set([...r.flags, "RERA_ON_TG_MAP"])];
  }
  accepted.push(r);
}

// Zone medians per type, over existing + accepted, for the price check.
const all = [...existing, ...accepted];
const zoneKey = (r: InventoryRecord) => `${zoneFor(r.listingKind === "LAND_LISTING" ? null : r.locality, r.lat, r.lng) ?? r.locality}|${r.propertyType}|${r.listingKind ?? "PROJECT"}`;
const rates = new Map<string, number[]>();
for (const r of all) {
  const xs = r.units.map((u) => u.ratePerSqFt ?? u.ratePerSqYd).filter((x): x is number => !!x).sort((a, b) => a - b);
  if (xs.length) rates.set(zoneKey(r), [...(rates.get(zoneKey(r)) ?? []), xs[Math.floor(xs.length / 2)]]);
}
const zoneMedian = (r: InventoryRecord) => {
  const xs = (rates.get(zoneKey(r)) ?? []).sort((a, b) => a - b);
  return xs.length >= 5 ? xs[Math.floor(xs.length / 2)] : null;
};
const final: InventoryRecord[] = [];
for (const r of accepted) {
  sanitiseUnits(r, zoneMedian);
  if (!(r.priceMinLakh > 0) || !r.units.some((u) => u.priceLakh != null)) {
    tally(src(r), "rejected: every price withheld");
    continue;
  }
  final.push({ ...r, description: describeRecord(r) });
  tally(src(r), `added: ${r.propertyType}`);
}

// Existing records now outside the area rule are dropped too.
const kept = existing.filter((r) => {
  const p = areaPoint(r);
  if (p && !inArea(p.lat, p.lng)) {
    tally(src(r), `removed existing: ${Math.round(distanceToPolylineKm(p.lat, p.lng, RRR_POLYGON, true))} km outside the RRR (${r.name})`);
    return false;
  }
  return true;
});

if (arg("--dump-h247-images")) {
  // Images of the Homes247 records that were accepted, for a by-eye watermark check.
  const keys = new Set(final.map((r) => r.key));
  fs.writeFileSync(arg("--dump-h247-images")!, JSON.stringify(Object.fromEntries(Object.entries(h247Images).filter(([k]) => keys.has(k))), null, 1));
}
// The same parcel is often posted by more than one agent: same village, size
// and price, pins within 300 m. Keep the earliest posting.
const landSeen: InventoryRecord[] = [];
const isDupLand = (r: InventoryRecord) =>
  landSeen.some(
    (o) =>
      o.propertyType === r.propertyType && o.subLocality === r.subLocality && o.priceMinLakh === r.priceMinLakh &&
      Math.abs((o.landAcres ?? 0) - (r.landAcres ?? 0)) < 0.001 &&
      o.lat != null && r.lat != null && haversineKm(o.lat, o.lng!, r.lat, r.lng!) <= 0.3,
  );
const byPosted = (a: InventoryRecord, b: InventoryRecord) => String(a.postedAt ?? "").localeCompare(String(b.postedAt ?? ""));
const deduped = new Set<string>();
for (const r of [...kept, ...final].filter((x) => x.listingKind === "LAND_LISTING").sort(byPosted)) {
  if (isDupLand(r)) {
    deduped.add(r.key);
    tally(src(r), "removed: same parcel posted twice");
  } else landSeen.push(r);
}

console.log(JSON.stringify(report, null, 1));
console.log(`floor-plan links repaired on ${repaired} existing records`);
console.log(`existing ${existing.length} → kept ${kept.length}; added ${final.length}; duplicates removed ${deduped.size}; total ${kept.length + final.length - deduped.size}`);
if (WRITE) {
  fs.writeFileSync(DATA, JSON.stringify([...kept, ...final].filter((r) => !deduped.has(r.key)), null, 1) + "\n");
  console.log(`wrote ${DATA}`);
}
