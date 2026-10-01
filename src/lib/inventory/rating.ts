// Property Tiger inventory rating (0–100 → A/B/C/D) for developer projects.
//
// Every component is computed from facts we collected for the project — RERA
// registration, litigation status, developer age, distance to the city's job
// hubs, delivery stage, planning density and price against local peers. No
// component is guessed: when a fact is missing the component takes a neutral
// value and says so in its note, so the rating never implies false precision.
//
// Pure functions; unit-tested in rating.test.ts.

export type InventoryType = "Apartment" | "Villa" | "Plots";

export interface RatingInput {
  propertyType: InventoryType;
  reraRegistered: boolean;
  litigation: "No" | "Yes" | null;
  developerEstablished: number | null;
  lat: number | null;
  lng: number | null;
  /** CorridorProfile.overallScore (0–100) when the locality sits in a tracked corridor */
  corridorScore: number | null;
  /** ISO date of RERA (or target) possession; null if unknown */
  possession: string | null;
  landAcres: number | null;
  towers: number | null;
  /** project's median ₹/sq.ft (apartments/villas) or ₹/sq.yd (plots) */
  medianRate: number | null;
  /** median of the same metric for same-type peers in the locality (≥3 peers) */
  peerMedianRate: number | null;
  now?: Date;
}

export interface RatingComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface Rating {
  total: number;
  grade: "A" | "B" | "C" | "D";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  components: RatingComponent[];
  method: "inventory-v1";
}

// HITEC City ↔ Financial District job cluster — the city's employment centre of gravity.
const JOB_HUB = { lat: 17.435, lng: 78.36 };

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function monthsUntil(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

function legal(i: RatingInput): RatingComponent {
  let p = i.reraRegistered ? 14 : 0;
  p += i.litigation === "No" ? 6 : i.litigation === "Yes" ? 0 : 3;
  const note = [
    i.reraRegistered ? "TS-RERA registered" : "No RERA registration on file",
    i.litigation === "No" ? "no litigation reported" : i.litigation === "Yes" ? "litigation reported" : "litigation status unknown",
  ].join("; ");
  return { key: "legal", label: "Legal & regulatory", points: p, max: 20, note };
}

function developer(i: RatingInput, now: Date): RatingComponent {
  if (!i.developerEstablished) return { key: "developer", label: "Developer track record", points: 8, max: 20, note: "Founding year not on record — neutral score" };
  const yrs = now.getFullYear() - i.developerEstablished;
  const p = yrs >= 30 ? 20 : yrs >= 20 ? 17 : yrs >= 10 ? 13 : yrs >= 5 ? 9 : 5;
  return { key: "developer", label: "Developer track record", points: p, max: 20, note: `In business ${yrs} years (est. ${i.developerEstablished})` };
}

function location(i: RatingInput): RatingComponent {
  if (i.lat == null || i.lng == null) {
    const p = i.corridorScore != null ? Math.round((i.corridorScore / 100) * 25) : 12;
    return { key: "location", label: "Location & connectivity", points: p, max: 25, note: i.corridorScore != null ? `Corridor score ${i.corridorScore}/100; exact location unverified` : "Exact location unverified — neutral score" };
  }
  const km = haversineKm({ lat: i.lat, lng: i.lng }, JOB_HUB);
  const dist = km <= 8 ? 25 : km <= 15 ? 21 : km <= 25 ? 16 : km <= 40 ? 11 : 7;
  const p = i.corridorScore != null ? Math.round(dist * 0.5 + (i.corridorScore / 100) * 25 * 0.5) : dist;
  const note = `${km.toFixed(1)} km from the HITEC City–Financial District job hub` + (i.corridorScore != null ? `; corridor score ${i.corridorScore}/100` : "");
  return { key: "location", label: "Location & connectivity", points: p, max: 25, note };
}

function delivery(i: RatingInput, now: Date): RatingComponent {
  const m = monthsUntil(i.possession, now);
  if (m == null) return { key: "delivery", label: "Delivery stage", points: 7, max: 15, note: "Possession date not on record — neutral score" };
  if (m <= 0) return { key: "delivery", label: "Delivery stage", points: 15, max: 15, note: "Ready / possession due" };
  const p = m <= 12 ? 12 : m <= 24 ? 9 : m <= 36 ? 6 : 4;
  return { key: "delivery", label: "Delivery stage", points: p, max: 15, note: `Possession in ~${m} months` };
}

function planning(i: RatingInput): RatingComponent {
  if (i.propertyType === "Villa") return { key: "planning", label: "Planning & density", points: 10, max: 10, note: "Low-rise villa community" };
  if (i.propertyType === "Plots") {
    if (!i.landAcres) return { key: "planning", label: "Planning & density", points: 6, max: 10, note: "Layout size not on record" };
    const p = i.landAcres >= 20 ? 9 : 7;
    return { key: "planning", label: "Planning & density", points: p, max: 10, note: `${i.landAcres} acre layout` };
  }
  if (!i.landAcres || !i.towers) return { key: "planning", label: "Planning & density", points: 5, max: 10, note: "Land/tower data incomplete — neutral score" };
  const perTower = i.landAcres / i.towers;
  const p = perTower >= 3 ? 10 : perTower >= 2 ? 8 : perTower >= 1 ? 6 : 4;
  return { key: "planning", label: "Planning & density", points: p, max: 10, note: `${perTower.toFixed(1)} acres per tower` };
}

function value(i: RatingInput): RatingComponent {
  if (!i.medianRate || !i.peerMedianRate) return { key: "value", label: "Price vs locality", points: 5, max: 10, note: "Not enough comparable projects nearby — neutral score" };
  const gap = (i.medianRate - i.peerMedianRate) / i.peerMedianRate;
  const pct = Math.round(gap * 100);
  const p = gap <= -0.1 ? 10 : gap <= 0.1 ? 7 : gap <= 0.25 ? 4 : 2;
  const note = Math.abs(pct) < 3 ? "Priced in line with the locality" : `${Math.abs(pct)}% ${pct < 0 ? "below" : "above"} the locality median`;
  return { key: "value", label: "Price vs locality", points: p, max: 10, note };
}

export function gradeOf(total: number): Rating["grade"] {
  return total >= 80 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : "D";
}

export function rateProject(i: RatingInput): Rating {
  const now = i.now ?? new Date();
  const components = [legal(i), developer(i, now), location(i), delivery(i, now), planning(i), value(i)];
  const total = Math.max(0, Math.min(100, components.reduce((s, c) => s + c.points, 0)));
  const months = monthsUntil(i.possession, now);
  let riskLevel: Rating["riskLevel"] = "MEDIUM";
  if (i.litigation === "Yes" || !i.reraRegistered || total < 55 || (months != null && months > 36)) riskLevel = "HIGH";
  else if (total >= 75 && (months == null || months <= 24)) riskLevel = "LOW";
  return { total, grade: gradeOf(total), riskLevel, components, method: "inventory-v1" };
}

/** Suggested investment horizon (years) from type and delivery timing. */
export function horizonFor(type: InventoryType, possession: string | null, now = new Date()): [number, number] {
  const m = monthsUntil(possession, now);
  const toPossession = m == null || m <= 0 ? 0 : Math.ceil(m / 12);
  if (type === "Plots") return [Math.max(3, toPossession + 3), Math.max(7, toPossession + 7)];
  return [Math.max(2, toPossession + 1), Math.max(5, toPossession + 5)];
}

/** Median of a numeric list (null when empty). */
export function median(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
