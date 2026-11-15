/**
 * Property Tiger Score — one 0–10 number for every listing, built from eight
 * lenses. The same rules apply to every listing; no builder or seller can pay
 * to change a score.
 *
 *   Lens               weight  What it measures (all from data we hold)
 *   Regulations          15    TG-RERA registration, declared litigation / criminal case, revocation
 *   Builder & delivery   15    builder's years, delivery against RERA dates, RERA orders, this project's stage
 *   Value for money      15    price against similar listings in the same area
 *   Transit              12.5  metro/rail stations, ORR exits, bus stations, airport (OpenStreetMap)
 *   Living               12.5  hospitals, schools, shops, parks and lakes nearby (OpenStreetMap)
 *   Infrastructure       10    government projects tracked for the area
 *   Growth               10    the area's base-case price scenario and jobs nearby
 *   Safety & site        10    lake buffers, power lines, landfills, quarries, sewage plants, emergency care
 *
 * Rules that keep it honest:
 * - A lens with no data is shown as "not enough data" and left out of the
 *   average. It never gets a made-up middle value.
 * - A listing needs at least 5 measured lenses to get a score.
 * - Caps: no TG-RERA registration ≤ 5.0; revoked registration or a declared
 *   criminal case ≤ 4.0; land listings (title unchecked) ≤ 6.0.
 *
 * Pure: unit-tested in lenses.test.ts.
 */

export const SCORE_VERSION = "tiger-v1";
export const MIN_LENSES = 5;

export type LensKey = "regulations" | "builder" | "value" | "transit" | "living" | "infra" | "growth" | "safety";

export const LENSES: { key: LensKey; label: string; weight: number }[] = [
  { key: "regulations", label: "Regulations", weight: 15 },
  { key: "builder", label: "Builder & delivery", weight: 15 },
  { key: "value", label: "Value for money", weight: 15 },
  { key: "transit", label: "Transit", weight: 12.5 },
  { key: "living", label: "Living", weight: 12.5 },
  { key: "infra", label: "Infrastructure", weight: 10 },
  { key: "growth", label: "Growth", weight: 10 },
  { key: "safety", label: "Safety & site", weight: 10 },
];

export interface AccessPart { points: number; max: number; note: string }

export interface ScoreInput {
  kind: "PROJECT" | "LAND";
  propertyType: string;
  // Regulations
  reraRegistered: boolean;
  litigation: "Yes" | "No" | null;
  criminalCase: boolean;
  revoked: boolean;
  /** Seller-stated layout permission (land listings only) */
  layoutStated: boolean;
  // Builder & delivery
  builder: {
    name: string;
    established: number | null;
    projects: number;
    withReraDeadline: number;
    overdue: number;
    extended: number;
    regulatoryOrders: number;
  } | null;
  ready: boolean;
  monthsToPossession: number | null;
  /** This project is past its TG-RERA completion date */
  overdue: boolean;
  // Value
  rate: number | null;
  rateUnit: "sq.ft" | "sq.yd" | "acre" | null;
  peerMedianRate: number | null;
  peerCount: number;
  zone: string | null;
  // Map-derived (OpenStreetMap); null when the pin hasn't been scored
  access: {
    connectivity: AccessPart;
    daily: AccessPart;
    jobs: AccessPart;
    green: AccessPart;
    hospitalKm: number | null;
    lakeKm: number | null;
    lakeName: string | null;
    watchOuts: { key: string; label: string }[];
  } | null;
  approxPin: boolean;
  // Area (nearest tracked corridor)
  area: { name: string; infraScore: number | null; baseCagr5: number | null } | null;
  now?: Date;
}

export interface Lens {
  key: LensKey;
  label: string;
  weight: number;
  /** 0–100, or null when there isn't enough data (or the lens doesn't apply) */
  score: number | null;
  status: "measured" | "no-data" | "not-applicable";
  note: string;
  source: string;
}

export interface TigerScore {
  version: string;
  /** 0–10, one decimal; null when fewer than MIN_LENSES lenses are measured */
  score: number | null;
  band: "Excellent" | "Very good" | "Good" | "Fair" | "Weak" | null;
  measured: number;
  lenses: Lens[];
  caps: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
const pct = (p: AccessPart) => (p.max > 0 ? (p.points / p.max) * 100 : 0);

function lens(key: LensKey, score: number | null, note: string, source: string, status?: Lens["status"]): Lens {
  const def = LENSES.find((l) => l.key === key)!;
  return {
    key,
    label: def.label,
    weight: def.weight,
    score: score == null ? null : round(clamp(score)),
    status: status ?? (score == null ? "no-data" : "measured"),
    note,
    source,
  };
}

function regulations(i: ScoreInput): Lens {
  const src = "TG-RERA registration and certificate; listing source";
  if (i.kind === "LAND") {
    const s = 30 + (i.layoutStated ? 20 : 0);
    const note = `Land listing, not a RERA project: no RERA protection, and the title isn't verified by us${i.layoutStated ? ". Seller states the layout is approved (not verified)" : ""}.`;
    return lens("regulations", s, note, "Listing source (seller-stated)");
  }
  if (i.revoked) return lens("regulations", 0, "TG-RERA lists this project's registration as revoked.", src);
  let s = i.reraRegistered ? 70 : 20;
  const parts = [i.reraRegistered ? "TG-RERA registered" : "No TG-RERA registration on file"];
  if (i.litigation === "No") { s += 25; parts.push("no litigation declared"); }
  else if (i.litigation === "Yes") { parts.push("litigation declared"); }
  else { s += 10; parts.push("litigation status not on record"); }
  if (i.criminalCase) { s -= 40; parts.push("promoter declared a pending criminal case"); }
  return lens("regulations", s, parts.join("; ") + ".", src);
}

function builder(i: ScoreInput, now: Date): Lens {
  const src = "TG-RERA certificates and orders; developer records";
  if (i.kind === "LAND") return lens("builder", null, "Individual seller — no builder record applies.", src, "not-applicable");
  const parts: { got: number; max: number; note: string }[] = [];
  const b = i.builder;
  if (b?.established) {
    const yrs = now.getFullYear() - b.established;
    parts.push({ got: yrs >= 20 ? 30 : yrs >= 10 ? 24 : yrs >= 5 ? 17 : 10, max: 30, note: `${b.name} in business ${yrs} years` });
  }
  if (b && b.withReraDeadline >= 2) {
    const late = b.overdue + b.extended * 0.5;
    const onTime = clamp(1 - late / b.withReraDeadline, 0, 1);
    parts.push({ got: 35 * onTime, max: 35, note: `${b.overdue} of ${b.withReraDeadline} projects past their RERA date, ${b.extended} extended` });
  }
  if (b && b.projects > 0) {
    const ratio = b.regulatoryOrders / b.projects;
    parts.push({ got: ratio === 0 ? 15 : ratio <= 0.25 ? 10 : ratio <= 0.5 ? 5 : 0, max: 15, note: b.regulatoryOrders ? `${b.regulatoryOrders} TG-RERA order${b.regulatoryOrders === 1 ? "" : "s"} name the builder` : "no TG-RERA orders name the builder" });
  }
  if (i.ready) parts.push({ got: 20, max: 20, note: "ready to move in" });
  else if (i.overdue) parts.push({ got: 0, max: 20, note: "this project is past its RERA completion date" });
  else if (i.monthsToPossession != null) {
    const m = i.monthsToPossession;
    parts.push({ got: m <= 24 ? 15 : m <= 36 ? 10 : 6, max: 20, note: `possession in about ${Math.max(0, m)} months` });
  }
  if (parts.length < 2) return lens("builder", null, "Not enough on record about this builder's delivery yet.", src);
  const s = (parts.reduce((t, p) => t + p.got, 0) / parts.reduce((t, p) => t + p.max, 0)) * 100;
  const note = parts.map((p) => p.note).join("; ");
  return lens("builder", s, note.charAt(0).toUpperCase() + note.slice(1) + ".", src);
}

function value(i: ScoreInput): Lens {
  const src = "Prices in our listings (developer price lists, seller asking prices)";
  if (i.rate == null || i.peerMedianRate == null || i.peerCount < 3 || !i.rateUnit) {
    return lens("value", null, "Not enough similar listings nearby to compare the price.", src);
  }
  const gap = (i.rate - i.peerMedianRate) / i.peerMedianRate;
  const s = gap <= -0.15 ? 95 : gap <= -0.05 ? 80 : gap <= 0.05 ? 65 : gap <= 0.15 ? 50 : gap <= 0.3 ? 35 : 20;
  const g = Math.round(gap * 100);
  const where = i.zone ? ` in ${i.zone}` : "";
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}/${i.rateUnit}`;
  const note = Math.abs(g) < 3
    ? `${fmt(i.rate)}, in line with the median of ${i.peerCount} similar listings${where}.`
    : `${fmt(i.rate)}, ${Math.abs(g)}% ${g < 0 ? "below" : "above"} the median (${fmt(i.peerMedianRate)}) of ${i.peerCount} similar listings${where}.`;
  return lens("value", s, note, src);
}

function transit(i: ScoreInput): Lens {
  const src = "OpenStreetMap places; straight-line distances";
  if (!i.access) return lens("transit", null, "This location hasn't been mapped against nearby places yet.", src);
  return lens("transit", pct(i.access.connectivity), i.access.connectivity.note, src);
}

function living(i: ScoreInput): Lens {
  const src = "OpenStreetMap places; straight-line distances";
  if (!i.access) return lens("living", null, "This location hasn't been mapped against nearby places yet.", src);
  const { daily, green } = i.access;
  const s = ((daily.points + green.points) / (daily.max + green.max)) * 100;
  return lens("living", s, [daily.note, green.note].filter(Boolean).join(" · "), src);
}

function infra(i: ScoreInput): Lens {
  const src = "Government projects we track, with official sources";
  if (!i.area || i.area.infraScore == null) return lens("infra", null, "No tracked area close enough to rate infrastructure.", src);
  const s = (i.area.infraScore / 25) * 100;
  return lens("infra", s, `${i.area.name}: infrastructure score ${i.area.infraScore}/25 from the government projects tracked for the area.`, src);
}

function growth(i: ScoreInput): Lens {
  const src = "Area price scenarios (published city figures + our measured prices); OpenStreetMap job hubs";
  const parts: { s: number; note: string }[] = [];
  if (i.area?.baseCagr5 != null) {
    const c = i.area.baseCagr5;
    parts.push({ s: clamp(((c - 3) / 6) * 70 + 20, 0, 95), note: `${i.area.name}: base-case price scenario about ${c}% a year over 5 years (a scenario, not a prediction)` });
  }
  if (i.access) parts.push({ s: pct(i.access.jobs), note: i.access.jobs.note ? `jobs nearby: ${i.access.jobs.note}` : "no mapped job hub nearby" });
  if (!parts.length) return lens("growth", null, "No area scenario or job data for this location yet.", src);
  return lens("growth", parts.reduce((t, p) => t + p.s, 0) / parts.length, parts.map((p) => p.note).join("; ") + ".", src);
}

function safety(i: ScoreInput): Lens {
  const src = "OpenStreetMap places; straight-line distances";
  if (!i.access) return lens("safety", null, "This location hasn't been checked against nearby hazards yet.", src);
  let s = 100;
  const notes: string[] = [];
  const keys = new Set(i.access.watchOuts.map((w) => w.key));
  for (const w of i.access.watchOuts) notes.push(w.label);
  if (keys.has("lake")) s -= 45;
  else if (!i.approxPin && i.access.lakeKm != null && i.access.lakeKm <= 0.2) {
    s -= 15;
    notes.push(`${i.access.lakeName ?? "A lake"} about ${Math.round(i.access.lakeKm * 1000)} m away — confirm the plot is outside its FTL and buffer zone`);
  }
  if (keys.has("power_line")) s -= 20;
  if (keys.has("landfill")) s -= 20;
  if (keys.has("quarry")) s -= 15;
  if (keys.has("sewage")) s -= 10;
  const h = i.access.hospitalKm;
  if (h == null || h > 6) { s -= 15; notes.push(h == null ? "No mapped hospital nearby" : `Nearest mapped hospital ${h.toFixed(1)} km away`); }
  else if (h > 3) s -= 5;
  if (!notes.length) notes.push(`No mapped hazards nearby; hospital ${h != null ? `${h.toFixed(1)} km` : "nearby"}`);
  if (i.approxPin) notes.push("map pin is approximate, so check the site in person");
  return lens("safety", s, notes.join("; ") + ".", src);
}

export function bandOf(score: number): NonNullable<TigerScore["band"]> {
  return score >= 8 ? "Excellent" : score >= 7 ? "Very good" : score >= 6 ? "Good" : score >= 5 ? "Fair" : "Weak";
}

export function scoreListing(i: ScoreInput): TigerScore {
  const now = i.now ?? new Date();
  const lenses = [regulations(i), builder(i, now), value(i), transit(i), living(i), infra(i), growth(i), safety(i)];
  const measured = lenses.filter((l) => l.score != null);
  const caps: string[] = [];
  if (measured.length < MIN_LENSES) {
    return { version: SCORE_VERSION, score: null, band: null, measured: measured.length, lenses, caps };
  }
  const w = measured.reduce((t, l) => t + l.weight, 0);
  let score = measured.reduce((t, l) => t + (l.score as number) * l.weight, 0) / w / 10;
  const cap = (max: number, why: string) => {
    if (score > max) { score = max; caps.push(why); }
  };
  if (i.kind === "PROJECT" && (i.revoked || i.criminalCase)) cap(4, "Capped at 4.0: revoked registration or a declared criminal case.");
  if (i.kind === "PROJECT" && !i.reraRegistered) cap(5, "Capped at 5.0: no TG-RERA registration on file.");
  if (i.kind === "LAND") cap(6, "Capped at 6.0: land title isn't verified until a lawyer checks it.");
  score = Math.round(score * 10) / 10;
  return { version: SCORE_VERSION, score, band: bandOf(score), measured: measured.length, lenses, caps };
}
