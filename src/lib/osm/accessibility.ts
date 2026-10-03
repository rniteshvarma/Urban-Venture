/**
 * Accessibility score (0–100) for a listing: how well connected and well
 * served its location is, from OpenStreetMap places. Shown as its own score,
 * separate from the listing rating.
 *
 *   built property (apartment / villa / commercial)   land (plots / land)
 *   connectivity 35 · daily needs 30 · jobs 20 · green 15     40 · 15 · 30 · 15
 *
 * Every component is "closer is better" with a linear fall-off, and every
 * note names the actual place and distance. Distances are straight-line.
 *
 * Fairness rules:
 * - Where few places are mapped near a pin (common on the city's growing
 *   edges), daily needs and green space score neutral instead of low.
 * - Schools are badly under-mapped, so a missing school never costs points.
 * - Warnings (power lines, landfills…) are listed, never deducted; the
 *   close-range ones are skipped for approximate pins.
 *
 * Pure: unit-tested in accessibility.test.ts.
 */
import { distanceToRingsKm, haversineKm, insideRing, type Ring } from "./geo";
import { OFFICE_PARK_NAME } from "./categories";

export const ACCESSIBILITY_VERSION = "access-v3";

export interface PointPlace { id: string; name: string | null; lat: number; lng: number; sub?: string | null; areaHa?: number | null }
export interface ShapePlace { id: string; name: string | null; rings: Ring[] }

export interface PlaceIndex {
  hospital: PointPlace[];
  transit: PointPlace[];
  orr_exit: PointPlace[];
  bus_station: PointPlace[];
  airport: PointPlace[];
  school: PointPlace[];
  college: PointPlace[];
  mall: PointPlace[];
  job_hub: PointPlace[];
  park: PointPlace[];
  landfill: PointPlace[];
  quarry: PointPlace[];
  sewage: PointPlace[];
  lake: ShapePlace[];
  power_line: ShapePlace[];
}

export interface Nearest { name: string | null; km: number; sub?: string | null }
export interface Component { key: "connectivity" | "daily" | "jobs" | "green"; label: string; points: number; max: number; note: string }
export interface WatchOut { key: string; label: string }

/** Places counted inside the 2 km and 5 km rings. */
export const RING_CATEGORIES = ["hospital", "transit", "school", "college", "mall", "park", "bus_station", "job_hub"] as const;
export type RingCategory = (typeof RING_CATEGORIES)[number];

export interface AccessibilityResult {
  version: string;
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  components: Component[];
  nearest: Partial<Record<"hospital" | "transit" | "orr_exit" | "bus_station" | "airport" | "school" | "college" | "mall" | "job_hub" | "park" | "lake", Nearest>>;
  within: Record<"2" | "5", Record<RingCategory, number>>;
  watchOuts: WatchOut[];
}

export interface AccessibilityInput {
  lat: number;
  lng: number;
  propertyType: string | null | undefined;
  /** "approximate" pins skip the close-range (tens of metres) warnings */
  coordPrecision?: string | null;
}

const WEIGHTS = {
  built: { connectivity: 35, daily: 30, jobs: 20, green: 15 },
  land: { connectivity: 40, daily: 15, jobs: 30, green: 15 },
};

/** 1 within `full` km, 0 beyond `zero` km, linear between. */
export const closeness = (km: number | null | undefined, full: number, zero: number): number =>
  km == null || !Number.isFinite(km) ? 0 : km <= full ? 1 : km >= zero ? 0 : (zero - km) / (zero - full);

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtKm = (km: number) => (km < 1 ? `${Math.round((km * 1000) / 10) * 10} m` : `${round1(km)} km`);
const named = (n: Nearest | undefined, fallback: string) => (n ? `${n.name ?? fallback} ${fmtKm(n.km)}` : null);

function nearestOf(places: PointPlace[], lat: number, lng: number, filter?: (p: PointPlace) => boolean): Nearest | undefined {
  let best: PointPlace | null = null;
  let bestKm = Infinity;
  for (const p of places) {
    if (filter && !filter(p)) continue;
    // Cheap bounding test first: 1° ≈ 111 km, so anything this far is never nearest.
    if (Math.abs(p.lat - lat) > 1 || Math.abs(p.lng - lng) > 1) continue;
    const km = haversineKm(lat, lng, p.lat, p.lng);
    if (km < bestKm) { bestKm = km; best = p; }
  }
  return best ? { name: best.name, km: Math.round(bestKm * 100) / 100, sub: best.sub ?? null } : undefined;
}

function countWithin(places: PointPlace[], lat: number, lng: number, km: number): number {
  let n = 0;
  const dLat = km / 110;
  for (const p of places) {
    if (Math.abs(p.lat - lat) > dLat || Math.abs(p.lng - lng) > dLat * 1.1) continue;
    if (haversineKm(lat, lng, p.lat, p.lng) <= km) n++;
  }
  return n;
}

/**
 * `polygons`: the shapes are areas (lakes), so a pin inside one is 0 km away.
 * Lines (power lines) are open paths — testing "inside" would treat a winding
 * line as if it enclosed everything within its loop.
 */
function nearestShape(shapes: ShapePlace[], lat: number, lng: number, polygons: boolean): { place: ShapePlace; km: number; inside: boolean } | null {
  let best: { place: ShapePlace; km: number; inside: boolean } | null = null;
  for (const s of shapes) {
    const km = distanceToRingsKm(s.rings, lat, lng);
    const inside = polygons && s.rings.some((r) => r.length > 3 && insideRing(r, lat, lng));
    if (inside) return { place: s, km: 0, inside: true };
    if (!best || km < best.km) best = { place: s, km, inside: false };
  }
  return best;
}

export function computeAccessibility(input: AccessibilityInput, idx: PlaceIndex): AccessibilityResult {
  const { lat, lng } = input;
  const land = /plot|land/i.test(input.propertyType ?? "");
  const W = land ? WEIGHTS.land : WEIGHTS.built;
  const exactPin = input.coordPrecision !== "approximate";

  const n = {
    hospital: nearestOf(idx.hospital, lat, lng),
    transit: nearestOf(idx.transit, lat, lng),
    orr_exit: nearestOf(idx.orr_exit, lat, lng),
    bus_station: nearestOf(idx.bus_station, lat, lng),
    airport: nearestOf(idx.airport, lat, lng),
    school: nearestOf(idx.school, lat, lng),
    college: nearestOf(idx.college, lat, lng),
    mall: nearestOf(idx.mall, lat, lng),
    job_hub: nearestOf(idx.job_hub, lat, lng),
    park: nearestOf(idx.park, lat, lng),
  };
  const lakeHit = nearestShape(idx.lake, lat, lng, true);
  const lake: Nearest | undefined = lakeHit ? { name: lakeHit.place.name, km: Math.round(lakeHit.km * 100) / 100 } : undefined;

  const within = {
    "2": Object.fromEntries(RING_CATEGORIES.map((c) => [c, countWithin(idx[c], lat, lng, 2)])) as Record<RingCategory, number>,
    "5": Object.fromEntries(RING_CATEGORIES.map((c) => [c, countWithin(idx[c], lat, lng, 5)])) as Record<RingCategory, number>,
  };

  // How well mapped is this neighbourhood? Few mapped places → don't punish it.
  const mapped10 = ["hospital", "mall", "park", "college", "school", "bus_station"].reduce(
    (s, c) => s + countWithin(idx[c as keyof PlaceIndex] as PointPlace[], lat, lng, 10), 0);
  const sparse = mapped10 < 4;
  let confidence: AccessibilityResult["confidence"] = sparse ? "LOW" : mapped10 < 12 ? "MEDIUM" : "HIGH";
  if (!exactPin && confidence === "HIGH") confidence = "MEDIUM";

  // ── Connectivity ──
  const conn =
    0.4 * closeness(n.orr_exit?.km, 1, 10) +
    0.35 * closeness(n.transit?.km, 0.5, 8) +
    0.1 * closeness(n.bus_station?.km, 1, 8) +
    0.15 * closeness(n.airport?.km, 10, 50);
  const connNote = [named(n.orr_exit, "ORR exit"), named(n.transit, "Station"), named(n.airport, "Airport")].filter(Boolean).join(" · ") || "No mapped transport nearby";

  // ── Daily needs ── (a missing school costs nothing: schools are under-mapped)
  const schoolPart = n.school && n.school.km <= 4 ? closeness(n.school.km, 0.5, 4) : 0.5;
  const daily =
    0.4 * closeness(n.hospital?.km, 0.5, 6) +
    0.1 * Math.min(within["5"].hospital, 10) / 10 +
    0.15 * closeness(n.college?.km, 1, 8) +
    0.2 * closeness(n.mall?.km, 1, 10) +
    0.15 * schoolPart;
  const dailyNote = sparse
    ? "Few places are mapped near here yet — neutral score"
    : [named(n.hospital, "Hospital"), named(n.mall, "Mall"), named(n.college, "College")].filter(Boolean).join(" · ");

  // ── Jobs ──
  // Any commercial / industrial area nearby, plus how far the nearest major
  // one is (100 ha+, or a named SEZ / IT park) — so a small estate next door
  // doesn't count the same as living near HITEC City or an industrial belt.
  const major = nearestOf(idx.job_hub, lat, lng, (h) => (h.areaHa ?? 0) >= 100 || OFFICE_PARK_NAME.test(h.name ?? ""));
  const jobs = 0.5 * closeness(n.job_hub?.km, 1, 10) + 0.5 * closeness(major?.km, 2, 20);
  const jobHub = major && n.job_hub && major.km - n.job_hub.km < 2 ? major : n.job_hub;
  const jobsNote = jobHub ? `${jobHub.name ?? "Commercial / industrial area"} ${fmtKm(jobHub.km)}` : "No mapped job hub within reach";

  // ── Green & open space ──
  const green = 0.7 * closeness(n.park?.km, 0.3, 3) + 0.3 * closeness(lake?.km, 0.5, 5);
  const greenNote = sparse
    ? "Few places are mapped near here yet — neutral score"
    : [named(n.park, "Park"), lake ? `${lake.name ?? "Lake"} ${fmtKm(lake.km)}` : null].filter(Boolean).join(" · ") || "No mapped park nearby";

  const parts = {
    connectivity: conn,
    daily: sparse ? 0.5 : daily,
    jobs,
    green: sparse ? 0.5 : green,
  };
  const components: Component[] = [
    { key: "connectivity", label: "Connectivity", points: Math.round(parts.connectivity * W.connectivity), max: W.connectivity, note: connNote },
    { key: "daily", label: "Daily needs", points: Math.round(parts.daily * W.daily), max: W.daily, note: dailyNote },
    { key: "jobs", label: "Jobs nearby", points: Math.round(parts.jobs * W.jobs), max: W.jobs, note: jobsNote },
    { key: "green", label: "Green & open space", points: Math.round(parts.green * W.green), max: W.green, note: greenNote },
  ];
  const score = Math.max(0, Math.min(100, components.reduce((s, c) => s + c.points, 0)));

  // ── Warnings (listed, never deducted) ──
  const watchOuts: WatchOut[] = [];
  if (exactPin) {
    const line = nearestShape(idx.power_line, lat, lng, false);
    if (line && line.km <= 0.075) watchOuts.push({ key: "power_line", label: `High-tension power line about ${fmtKm(line.km)} away` });
    if (lakeHit && (lakeHit.inside || lakeHit.km <= 0.03)) {
      watchOuts.push({ key: "lake", label: `${lakeHit.inside ? "Pin falls inside" : `About ${fmtKm(lakeHit.km)} from`} ${lakeHit.place.name ?? "a lake"} — check its FTL buffer zone` });
    }
    const sewage = nearestOf(idx.sewage, lat, lng);
    if (sewage && sewage.km <= 0.5) watchOuts.push({ key: "sewage", label: `Sewage treatment plant ${fmtKm(sewage.km)} away` });
  }
  const landfill = nearestOf(idx.landfill, lat, lng);
  if (landfill && landfill.km <= 3) watchOuts.push({ key: "landfill", label: `Landfill ${fmtKm(landfill.km)} away${landfill.name ? ` (${landfill.name})` : ""}` });
  const quarry = nearestOf(idx.quarry, lat, lng);
  if (quarry && quarry.km <= 1) watchOuts.push({ key: "quarry", label: `Quarry ${fmtKm(quarry.km)} away` });

  return {
    version: ACCESSIBILITY_VERSION,
    score,
    confidence,
    components,
    nearest: { ...n, lake },
    within,
    watchOuts,
  };
}
