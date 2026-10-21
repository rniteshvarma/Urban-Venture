/**
 * The words on a corridor — its heat label, timing stage, risk level, key
 * drivers, key risks and who it suits — derived from measured data, each
 * with the source it came from.
 *
 * These used to be typed in by hand (a seed file and a fallback map), so a
 * corridor could be labelled "Fire · Act now" or credited with "rents up 25%"
 * with nothing behind it. Every rule below is stated in `basis` so the page
 * can show how a label was reached. Pure: tested in narrative.test.ts.
 */
import type { CorridorMarketStats } from "./compute";

export type HeatRating = "FIRE" | "VERY_HOT" | "HOT" | "WARM" | "EMERGING" | "EARLY";
export type InvCycle = "ACT_NOW" | "MID_CYCLE" | "WATCH_AND_BUY" | "PATIENT_CAPITAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Persona = "FIRST_TIME_BUYER" | "NRI_INVESTOR" | "LAND_SPECULATOR" | "RETIREMENT_PLANNER" | "HNI_PORTFOLIO_BUILDER" | "PROFESSIONAL_FIRST_HOME";

export interface Fact {
  text: string;
  source: string;
  url?: string | null;
}

export interface InfraNearby {
  name: string;
  status: string;
  distanceKm: number | null;
  estimatedCompletion: string | null;
  /** From infra-intel yearsToCompletion; 0 when complete */
  yearsToGo: number;
  /** Status not re-verified recently */
  stale: boolean;
  sourceUrl: string | null;
}

export interface DeliveryRecord {
  /** Our listings near the corridor (the denominator for the counts below) */
  projects: number;
  /** Projects near the corridor with a TG-RERA completion date we know */
  withDeadline: number;
  /** …of which the date has passed and the project isn't completed */
  overdue: number;
  /** …of which TG-RERA extended the date */
  extended: number;
  /** TG-RERA orders naming developers with projects near the corridor */
  orders: number;
}

export interface NarrativeInput {
  label: string;
  market: CorridorMarketStats;
  /** Infrastructure counted in the corridor's infra score, strongest first */
  infra: InfraNearby[];
  delivery: DeliveryRecord;
  overallScore: number;
}

export interface CorridorNarrative {
  heatRating: HeatRating;
  investmentCycle: InvCycle;
  riskLevel: RiskLevel;
  drivers: Fact[];
  risks: Fact[];
  bestFor: Persona[];
  /** How each label was reached, in plain words */
  basis: { heat: string; cycle: string; risk: string };
  delivery: DeliveryRecord;
  overallScore: number;
}

export const NARRATIVE_VERSION = "narrative-v1";

const OPEN = new Set(["ANNOUNCED", "APPROVED", "LAND_ACQUISITION"]);
const BUILDING = new Set(["UNDER_CONSTRUCTION", "PARTIALLY_COMPLETE", "DELAYED"]);
const STATUS_WORDS: Record<string, string> = {
  ANNOUNCED: "announced",
  APPROVED: "approved, not yet started",
  LAND_ACQUISITION: "land acquisition under way",
  UNDER_CONSTRUCTION: "under construction",
  PARTIALLY_COMPLETE: "partly open",
  COMPLETE: "complete",
  DELAYED: "delayed",
};
/** Infrastructure further than this from the corridor centre isn't described as "nearby". */
export const NEAR_KM = 15;

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

export const HEAT_BANDS: [number, HeatRating][] = [
  [80, "FIRE"],
  [70, "VERY_HOT"],
  [60, "HOT"],
  [50, "WARM"],
  [40, "EMERGING"],
  [0, "EARLY"],
];

export function heatFor(score: number): HeatRating {
  return HEAT_BANDS.find(([min]) => score >= min)![1];
}

export function cycleFor(infra: InfraNearby[]): { cycle: InvCycle; basis: string } {
  const near = infra.filter((p) => p.status !== "CANCELLED" && (p.distanceKm == null || p.distanceKm <= NEAR_KM));
  const building = near.find((p) => BUILDING.has(p.status) || (p.status === "COMPLETE" && p.yearsToGo === 0));
  if (building) {
    const what = building.status === "COMPLETE" ? "is complete" : `is ${STATUS_WORDS[building.status] ?? "under way"}`;
    return { cycle: "MID_CYCLE", basis: `${building.name} ${what}.` };
  }
  const soon = near.filter((p) => OPEN.has(p.status)).sort((a, b) => a.yearsToGo - b.yearsToGo)[0];
  if (soon && soon.yearsToGo <= 3) return { cycle: "ACT_NOW", basis: `${soon.name} is ${STATUS_WORDS[soon.status]}, due ${soon.estimatedCompletion ?? "within about 3 years"}.` };
  if (soon && soon.yearsToGo <= 6) return { cycle: "WATCH_AND_BUY", basis: `The nearest major project, ${soon.name}, is ${STATUS_WORDS[soon.status]} and due ${soon.estimatedCompletion ?? "in 3–6 years"}.` };
  return {
    cycle: "PATIENT_CAPITAL",
    basis: soon ? `${soon.name} is ${STATUS_WORDS[soon.status]} with completion ${soon.estimatedCompletion ?? "not yet scheduled"}.` : "No tracked infrastructure project is under way nearby.",
  };
}

export function buildNarrative(input: NarrativeInput): CorridorNarrative {
  const { label, market: m, infra, delivery: d, overallScore } = input;
  const near = infra.filter((p) => p.status !== "CANCELLED" && (p.distanceKm == null || p.distanceKm <= NEAR_KM));
  const plot = m.rates.plot;
  const apt = m.rates.apartment;
  const cityPlot = m.city.plotMedianSqYd;
  const cityApt = m.city.aptAvgSqFt.value;
  const cityYield = m.city.rentalYield.value;
  const rent = m.rental;
  const listings = `Property Tiger listings (${m.counts.totalProjects} projects within ${m.counts.radiusKm} km)`;

  // ── Drivers ────────────────────────────────────────────────────────────
  const drivers: Fact[] = [];
  for (const p of near.filter((p) => p.status !== "COMPLETE" || p.yearsToGo === 0).slice(0, 3)) {
    const when = p.status === "COMPLETE" ? "" : p.estimatedCompletion ? `, due ${p.estimatedCompletion}` : "";
    const where = p.distanceKm != null ? ` — ${p.distanceKm} km away` : "";
    drivers.push({ text: `${p.name}: ${STATUS_WORDS[p.status] ?? p.status.toLowerCase()}${when}${where}`, source: "Infrastructure tracker", url: p.sourceUrl });
  }
  if (rent?.grossYield != null && rent.grossYield >= cityYield) {
    drivers.push({ text: `Gross rental yield about ${rent.grossYield}% on apartments (Hyderabad ${cityYield}%)`, source: `Measured from ${rent.listings} rental listings within ${rent.radiusKm} km` });
  }
  if (plot && cityPlot && plot.median <= cityPlot * 0.85) {
    drivers.push({ text: `Plots around ${inr(plot.median)}/sq.yd — ${Math.abs(pct(plot.median, cityPlot))}% below the median across our Hyderabad listings`, source: listings });
  } else if (apt && apt.median <= cityApt * 0.85) {
    drivers.push({ text: `Apartments around ${inr(apt.median)}/sq.ft — ${Math.abs(pct(apt.median, cityApt))}% below the Hyderabad average`, source: `${listings}; ${m.city.aptAvgSqFt.source}`, url: m.city.aptAvgSqFt.url });
  }
  if (m.counts.activeProjects >= 10) {
    drivers.push({ text: `${m.counts.activeProjects} projects under construction or launching within ${m.counts.radiusKm} km`, source: listings });
  }
  if (m.counts.readyProjects >= 10) {
    drivers.push({ text: `${m.counts.readyProjects} ready-to-move projects within ${m.counts.radiusKm} km`, source: listings });
  }

  // ── Risks ──────────────────────────────────────────────────────────────
  const risks: Fact[] = [];
  let riskPoints = 0;
  const riskWhy: string[] = [];
  if (d.withDeadline >= 3 && d.overdue > 0) {
    const share = d.overdue / d.withDeadline;
    risks.push({ text: `${d.overdue} of ${d.withDeadline} nearby projects with a TG-RERA completion date are past it`, source: "TG-RERA project registrations" });
    if (share >= 0.25) { riskPoints += 2; riskWhy.push(`${Math.round(share * 100)}% of projects with RERA dates are overdue`); }
    else if (share >= 0.1) { riskPoints += 1; riskWhy.push(`${Math.round(share * 100)}% of projects with RERA dates are overdue`); }
  }
  if (d.extended > 0) {
    risks.push({ text: `${d.extended} nearby project${d.extended === 1 ? " has" : "s have"} had the TG-RERA completion date extended`, source: "TG-RERA project registrations" });
  }
  if (d.orders >= 5) {
    risks.push({ text: `Developers with projects here are named in ${d.orders} TG-RERA orders (complaints, penalties or revocations)`, source: "TG-RERA orders" });
    // Big developers collect orders across many projects, so it counts against
    // the corridor only when orders are frequent relative to the projects here.
    if (d.orders / Math.max(1, d.projects) >= 0.25) {
      riskPoints += 1;
      riskWhy.push(`${d.orders} TG-RERA orders across ${d.projects} projects`);
    }
  }
  const lead = near[0];
  if (lead && OPEN.has(lead.status)) {
    risks.push({ text: `The main infrastructure here, ${lead.name}, is ${STATUS_WORDS[lead.status]} — timelines for projects at this stage often slip`, source: "Infrastructure tracker", url: lead.sourceUrl });
    if (!near.some((p) => BUILDING.has(p.status) || p.status === "COMPLETE")) { riskPoints += 1; riskWhy.push("no nearby infrastructure under construction yet"); }
  }
  const stale = near.filter((p) => p.stale);
  if (stale.length) {
    risks.push({ text: `Status of ${stale.map((p) => p.name).slice(0, 2).join(" and ")} hasn't been re-verified recently`, source: "Infrastructure tracker" });
  }
  const primaryRates = m.rates[m.primaryAsset];
  if (!primaryRates || primaryRates.confidence === "LOW" || m.counts.totalProjects < 5) {
    risks.push({ text: primaryRates ? `Prices rest on only ${primaryRates.projects} projects — treat them as indicative` : `Too few listings to measure prices in ${label}`, source: listings });
    riskPoints += 1;
    riskWhy.push("thin price data");
  }
  if (apt && apt.median >= cityApt * 1.3) {
    risks.push({ text: `Apartments around ${inr(apt.median)}/sq.ft — ${pct(apt.median, cityApt)}% above the Hyderabad average, a high entry price`, source: `${listings}; ${m.city.aptAvgSqFt.source}`, url: m.city.aptAvgSqFt.url });
  }
  if (rent?.grossYield != null && rent.grossYield < cityYield) {
    risks.push({ text: `Gross rental yield about ${rent.grossYield}%, below the Hyderabad ${cityYield}%`, source: `Measured from ${rent.listings} rental listings within ${rent.radiusKm} km` });
  }
  const riskLevel: RiskLevel = riskPoints >= 3 ? "HIGH" : riskPoints >= 1 ? "MEDIUM" : "LOW";

  // ── Who it suits ───────────────────────────────────────────────────────
  const bestFor: Persona[] = [];
  const add = (p: Persona) => !bestFor.includes(p) && bestFor.push(p);
  if (apt && apt.median >= cityApt * 1.3) add("HNI_PORTFOLIO_BUILDER");
  if (rent?.grossYield != null && rent.grossYield >= cityYield) add("NRI_INVESTOR");
  if (apt && apt.median <= cityApt && m.counts.readyProjects >= 3) add("FIRST_TIME_BUYER");
  if (m.primaryAsset === "plot" && plot && (!cityPlot || plot.median <= cityPlot * 1.15)) add("LAND_SPECULATOR");
  if (apt && apt.median <= cityApt * 1.1 && m.counts.activeProjects >= 5) add("PROFESSIONAL_FIRST_HOME");

  const { cycle, basis: cycleBasis } = cycleFor(infra);
  const heatRating = heatFor(overallScore);
  return {
    heatRating,
    investmentCycle: cycle,
    riskLevel,
    drivers: drivers.slice(0, 5),
    risks: risks.slice(0, 5),
    bestFor: bestFor.slice(0, 2),
    basis: {
      heat: `Corridor score ${overallScore}/100 (infrastructure, RERA-registered projects, developer activity and growth outlook).`,
      cycle: cycleBasis,
      risk: riskWhy.length ? `${riskLevel === "LOW" ? "Low" : riskLevel === "MEDIUM" ? "Medium" : "High"}: ${riskWhy.join("; ")}.` : "Low: no delivery, regulatory, infrastructure or data-coverage flags.",
    },
    delivery: d,
    overallScore,
  };
}

/** What we can't say yet about a corridor, so the page can be upfront about it. */
export function coverageGaps(m: CorridorMarketStats, d: DeliveryRecord, hasYearOnYear: boolean): string[] {
  const gaps: string[] = [];
  if (!m.rates.plot) gaps.push("Plot prices — not enough plot listings nearby.");
  if (!m.rates.apartment) gaps.push("Apartment prices — not enough apartment listings nearby.");
  if (!m.rental?.grossYield) gaps.push("Rental yield — not enough rental listings measured nearby.");
  if (!m.guidance) gaps.push("Government guidance values — villages not mapped yet.");
  if (d.withDeadline === 0) gaps.push("Delivery record — no TG-RERA completion dates read for nearby projects yet.");
  if (!hasYearOnYear) gaps.push("Price history — we record prices every quarter; year-on-year growth appears once a year of data exists.");
  return gaps;
}
