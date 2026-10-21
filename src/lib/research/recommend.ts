/**
 * The /research report: which of our corridors fit a budget and horizon,
 * worked out from measured data — entry prices from our listings, growth
 * from the scenario model, and drivers / risks from the corridor narrative
 * (src/lib/market/narrative.ts).
 *
 * This replaced a report written by a model or, without an API key, a
 * hand-typed one with invented growth rates (15–25% a year), job numbers and
 * corridors we don't cover. Pure ranking is tested in recommend.test.ts.
 */
import type { CorridorMarketStats } from "../market/compute";
import type { Asset } from "../market/rates";
import { CITY } from "../market/anchors";

/** Sizes a first purchase is priced at: a typical plot and a typical 2–3 BHK. */
export const ENTRY_PLOT_SQYD = 150;
export const ENTRY_APT_SQFT = 1100;

export interface CorridorForResearch {
  slug: string;
  name: string;
  shortName: string;
  zone: string;
  overallScore: number;
  market: CorridorMarketStats;
}

export interface ResearchCorridor {
  slug: string;
  name: string;
  area: string;
  matchScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  /** Scenario growth, % a year (conservative and optimistic) */
  appreciationMin: number;
  appreciationMax: number;
  asset: Asset;
  /** Typical entry price, ₹ lakh, and how it was worked out */
  entryLakh: number;
  entryBasis: string;
  /** Gross rental yield range used for income, % a year; null for plots */
  rentalYield: [number, number] | null;
  reasons: string[];
  infraHighlights: string[];
  exitOpportunities: string[];
  bestFor: string;
  sources: string[];
}

export interface ResearchReport {
  executiveSummary: string;
  corridors: ResearchCorridor[];
  overallRiskScore: number;
  riskRationale: string;
  marketOutlook: string;
  disclaimer: string;
  basis: string;
}

const RISK_POINTS = { LOW: 3, MEDIUM: 5, HIGH: 8 } as const;
const lakh = (rupees: number) => Math.round(rupees / 1000) / 100;
const humanPersona = (p: string) => p.toLowerCase().replace(/_/g, " ");

/** The cheapest way into a corridor with the given asset, from the lower quartile of our listings. */
export function entryPrice(m: CorridorMarketStats, asset: Asset): { lakh: number; basis: string } | null {
  const r = m.rates[asset];
  if (!r) return null;
  if (asset === "plot") {
    return { lakh: lakh(r.p25 * ENTRY_PLOT_SQYD), basis: `a ${ENTRY_PLOT_SQYD} sq.yd plot at ₹${Math.round(r.p25).toLocaleString("en-IN")}/sq.yd (lower quartile of ${r.projects} projects)` };
  }
  return { lakh: lakh(r.p25 * ENTRY_APT_SQFT), basis: `a ${ENTRY_APT_SQFT} sq.ft flat at ₹${Math.round(r.p25).toLocaleString("en-IN")}/sq.ft (lower quartile of ${r.projects} projects)` };
}

/**
 * How well a corridor suits the brief, 0–100: its corridor score, adjusted
 * for whether its infrastructure timeline fits the horizon, its risk against
 * a short horizon, how much of the budget the entry uses, and how solid the
 * price data is. Every adjustment is listed in the report's `basis`.
 */
export function fitScore(c: CorridorForResearch, asset: Asset, entryLakh: number, budget: number, horizon: number): number {
  const n = c.market.narrative;
  let s = c.overallScore;
  const cycle = n?.investmentCycle;
  if (cycle === "PATIENT_CAPITAL" || cycle === "WATCH_AND_BUY") s += horizon >= 7 ? 6 : -10;
  else if (cycle === "MID_CYCLE") s += 4;
  if (n?.riskLevel === "HIGH" && horizon < 5) s -= 8;
  const use = entryLakh / budget;
  if (use >= 0.4) s += 4;
  if (c.market.rates[asset]?.confidence === "LOW") s -= 6;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function recommend(corridors: CorridorForResearch[], budget: number, horizon: number): ResearchReport {
  const scenarioYears = horizon <= 5 ? 5 : 10;
  const candidates: ResearchCorridor[] = [];
  for (const c of corridors) {
    const m = c.market;
    const n = m.narrative;
    // Prefer the corridor's main asset; fall back to the other if only that fits.
    const order: Asset[] = m.primaryAsset === "plot" ? ["plot", "apartment"] : ["apartment", "plot"];
    const fit = order.map((a) => ({ a, e: entryPrice(m, a) })).find((x) => x.e && x.e.lakh <= budget);
    if (!fit || !fit.e) continue;
    const f = m.forecast[fit.a].scenarios;
    const cagr = (k: "conservative" | "optimistic") => (scenarioYears === 5 ? f[k].cagr5 : f[k].cagr10);
    const rent = fit.a === "apartment" ? (m.rental?.grossYieldRange ?? null) : null;
    const drivers = n?.drivers ?? [];
    candidates.push({
      slug: c.slug,
      name: c.shortName || c.name,
      area: c.zone,
      matchScore: fitScore(c, fit.a, fit.e.lakh, budget, horizon),
      riskLevel: n?.riskLevel ?? "MEDIUM",
      appreciationMin: cagr("conservative"),
      appreciationMax: cagr("optimistic"),
      asset: fit.a,
      entryLakh: fit.e.lakh,
      entryBasis: fit.e.basis,
      rentalYield: rent,
      reasons: [
        `Entry from about ₹${fit.e.lakh} lakh — ${fit.e.basis}.`,
        // Market drivers about the other asset (e.g. flat rents for a plot buyer) are left out.
        ...drivers.filter((d) => d.source !== "Infrastructure tracker" && (fit.a === "apartment" || !/apartment|rental yield/i.test(d.text))).map((d) => d.text).slice(0, 2),
        ...(n?.risks?.[0] ? [`Watch: ${n.risks[0].text}.`] : []),
      ],
      infraHighlights: drivers.filter((d) => d.source === "Infrastructure tracker").map((d) => d.text.split(":")[0]).slice(0, 3),
      exitOpportunities: fit.a === "plot" ? ["Resell the plot", "Build and sell or rent"] : rent ? [`Rent out (measured gross yield ${rent[0]}–${rent[1]}%)`, "Resell"] : ["Rent out", "Resell"],
      bestFor: n?.bestFor?.length ? n.bestFor.map(humanPersona).join(", ") : "—",
      sources: [`Property Tiger listings`, `Property Tiger scenario model (${scenarioYears}-year growth)`, ...new Set(drivers.map((d) => d.source))],
    });
  }
  candidates.sort((a, b) => b.matchScore - a.matchScore || a.entryLakh - b.entryLakh);
  const picked = candidates.slice(0, 3);

  const riskAvg = picked.length ? picked.reduce((s, c) => s + RISK_POINTS[c.riskLevel], 0) / picked.length : 5;
  const overallRiskScore = Math.min(10, Math.round(riskAvg + (horizon < 3 ? 1 : 0)));

  const executiveSummary = picked.length
    ? `With ₹${budget} lakh over ${horizon} year${horizon === 1 ? "" : "s"}, ${candidates.length} of the ${corridors.length} corridors we track have typical entry prices within budget. Best matches: ${picked.map((c) => c.name).join(", ")} — ranked by corridor score, how their infrastructure timeline fits your horizon, and risk.`
    : `None of the ${corridors.length} corridors we track has a typical entry price within ₹${budget} lakh (a ${ENTRY_PLOT_SQYD} sq.yd plot or a ${ENTRY_APT_SQFT} sq.ft flat at the lower quartile of our listings). Smaller plots or resale homes may still fit — browse projects to see individual prices.`;

  return {
    executiveSummary,
    corridors: picked,
    overallRiskScore,
    riskRationale: picked.length
      ? picked.map((c) => `${c.name} — ${corridors.find((x) => x.slug === c.slug)?.market.narrative?.basis.risk ?? c.riskLevel}`).join(" ") + (horizon < 3 ? " Under 3 years leaves little time to recover from a delay." : "")
      : "No corridor fits the budget, so there's nothing to assess.",
    marketOutlook: `Hyderabad homes averaged ₹${CITY.avgPriceSqFt.value.toLocaleString("en-IN")}/sq.ft in ${CITY.avgPriceSqFt.period}, up ${CITY.priceGrowthYoY.value}% a year (${CITY.avgPriceSqFt.source}). Growth figures above are scenarios from our model, not predictions.`,
    disclaimer: "Worked out from our listings, public records and published market reports — not investment advice. Check the specific property's RERA registration, approvals and title before paying.",
    basis: `Entry price: ${ENTRY_PLOT_SQYD} sq.yd plot or ${ENTRY_APT_SQFT} sq.ft flat at the lower quartile of our listings. Match: corridor score, +4 if infrastructure is under way, +6/−10 for long-horizon corridors depending on whether you hold 7+ years, −8 for high risk under 5 years, +4 if the entry uses 40%+ of the budget, −6 for thin price data.`,
  };
}
