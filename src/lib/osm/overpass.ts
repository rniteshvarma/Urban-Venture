/**
 * Fetching from OpenStreetMap's Overpass API, and turning its elements into
 * the places we store. Imports are batch jobs (monthly), never per request,
 * to respect the public servers' fair-use policy.
 */
import { JOB_HUB_NAME, OSM_CATEGORIES, OSM_REGION, type OsmCategory, type OsmCategoryDef } from "./categories";
import { ringAreaHa, ringCentre, thinRing, type Ring } from "./geo";

/**
 * Public Overpass servers, tried in order; a refusal, error or stall moves on
 * to the next. Availability varies a lot: on 2026-10-03 the main instance
 * refused us outright (HTTP 406, fast), maps.mail.ru answered, and the kumi,
 * private.coffee and openstreetmap.ru mirrors timed out. OSM_OVERPASS_URL,
 * when set (e.g. a self-hosted instance), is tried first.
 */
export function overpassEndpoints(): string[] {
  const own = process.env.OSM_OVERPASS_URL?.trim();
  return [
    ...(own ? [own] : []),
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
}

const USER_AGENT = "PropertyTiger/1.0 (accessibility scoring; monthly batch import)";

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
  tags?: Record<string, string>;
}

export function buildQuery(category: OsmCategory): string {
  const def: OsmCategoryDef = OSM_CATEGORIES[category];
  const bbox = `(${OSM_REGION.south},${OSM_REGION.west},${OSM_REGION.north},${OSM_REGION.east})`;
  const body = def.selectors.map((s) => `${s.replace("{{bbox}}", bbox)};`).join("");
  return `[out:json][timeout:180];(${body});out ${def.shape === "point" ? "center" : "geom"} tags;`;
}

/**
 * `deadline` (epoch ms) caps the whole call, so a serverless run stops trying
 * mirrors before the platform kills it.
 */
export async function fetchOverpass(query: string, timeoutMs = 150_000, deadline = Infinity): Promise<OverpassElement[]> {
  const errors: string[] = [];
  for (const url of overpassEndpoints()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 15_000));
      const left = deadline - Date.now();
      if (left < 10_000) throw new Error(`Overpass unavailable — out of time; ${errors.join("; ")}`);
      const r = await tryEndpoint(url, query, Math.min(timeoutMs, left));
      if (r.ok) return r.elements;
      errors.push(r.error);
      // A busy server (429 / 502-504) usually answers a retry; anything else moves on.
      if (!r.busy) break;
    }
  }
  throw new Error(`Overpass unavailable — ${errors.join("; ")}`);
}

type Attempt = { ok: true; elements: OverpassElement[] } | { ok: false; error: string; busy: boolean };

async function tryEndpoint(url: string, query: string, timeoutMs: number): Promise<Attempt> {
  const host = new URL(url).host;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": USER_AGENT },
      body: new URLSearchParams({ data: query }).toString(),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: `${host}: HTTP ${res.status}`, busy: [429, 502, 503, 504].includes(res.status) };
    const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
    // Overpass reports a timeout or memory limit as a 200 with a remark.
    if (json.remark && /error|timed out|out of memory/i.test(json.remark)) {
      return { ok: false, error: `${host}: ${json.remark.slice(0, 120)}`, busy: true };
    }
    return { ok: true, elements: json.elements ?? [] };
  } catch (e) {
    // A stalled server is not retried — that would just double the wait.
    return { ok: false, error: `${host}: ${e instanceof Error ? e.message : String(e)}`, busy: false };
  } finally {
    clearTimeout(timer);
  }
}

export interface NormalisedPlace {
  id: string;
  category: OsmCategory;
  subcategory: string | null;
  name: string | null;
  lat: number;
  lng: number;
  areaHa: number | null;
  geometry: Ring[] | null;
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

function ringsOf(el: OverpassElement): Ring[] {
  const toRing = (g: { lat: number; lon: number }[]) => g.map((p) => [p.lon, p.lat] as [number, number]);
  if (el.geometry?.length) return [toRing(el.geometry)];
  if (el.members?.length) {
    return el.members
      .filter((m) => m.geometry?.length && (m.role === "outer" || m.role === "" || m.role === undefined))
      .map((m) => toRing(m.geometry!));
  }
  return [];
}

function subcategoryOf(category: OsmCategory, tags: Record<string, string>): string | null {
  if (category === "transit") {
    const metro = tags.station === "subway" || tags.station === "light_rail" || tags.subway === "yes" || tags.light_rail === "yes" || /metro/i.test(`${tags.name ?? ""} ${tags.network ?? ""} ${tags.operator ?? ""}`);
    return metro ? "metro" : "rail";
  }
  if (category === "job_hub") return tags.landuse ?? "named";
  if (category === "college") return tags.amenity ?? null;
  return null;
}

/** Overpass elements → places to store, deduplicated, filtered and simplified. */
export function normalise(category: OsmCategory, elements: OverpassElement[]): NormalisedPlace[] {
  const def: OsmCategoryDef = OSM_CATEGORIES[category];
  const out = new Map<string, NormalisedPlace>();
  for (const el of elements) {
    const id = `${el.type}/${el.id}`;
    if (out.has(id)) continue;
    const tags = el.tags ?? {};
    const name = tags.name || tags["name:en"] || null;
    const rings = def.shape === "point" ? [] : ringsOf(el);

    let lat: number | undefined, lng: number | undefined;
    if (el.lat != null && el.lon != null) { lat = el.lat; lng = el.lon; }
    else if (el.center) { lat = el.center.lat; lng = el.center.lon; }
    else {
      const c = ringCentre(rings);
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (lat == null || lng == null) continue;

    const areaHa = def.shape === "area" && rings.length ? Math.round(rings.reduce((s, r) => s + ringAreaHa(r), 0) * 10) / 10 : null;
    // Small unnamed commercial / industrial patches aren't job hubs, and nor
    // are the roads and car parks named after one.
    if (category === "job_hub" && (tags.highway || tags.parking || tags.amenity === "parking" || /\b(parking|road|route)\b/i.test(name ?? ""))) continue;
    if (def.minAreaHa && !(name && JOB_HUB_NAME.test(name)) && (areaHa ?? 0) < def.minAreaHa) continue;

    const geometry = def.shape === "shape" ? rings.map((r) => thinRing(r).map(([x, y]) => [round5(x), round5(y)] as [number, number])) : null;
    if (def.shape === "shape" && !geometry?.length) continue;

    out.set(id, { id, category, subcategory: subcategoryOf(category, tags), name, lat: round5(lat), lng: round5(lng), areaHa, geometry });
  }
  return [...out.values()];
}
