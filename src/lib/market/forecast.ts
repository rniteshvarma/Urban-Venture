/**
 * Corridor price scenarios, 2026 = 100.
 *
 * Built from published city figures, not a target return:
 *   conservative  RBI all-India house price growth (~ inflation; flat in real terms)
 *   base          Hyderabad's current pace (Knight Frank, H1 2026)
 *   optimistic    a repeat of Hyderabad's 2019–2026 run (ANAROCK)
 * then adjusted per corridor:
 *   + land premium for plots (land moves faster and more unevenly than flats) —
 *     a modelling assumption, stated as one on the page
 *   + infrastructure premium from the corridor's infra score (±1.5 pts a year),
 *     fading by half every 4 years as the projects get priced in
 *   ± wider range where our price data is thin or the area is early-stage
 *
 * These are scenarios, not predictions. Pure: unit-tested in market.test.ts.
 */
import { CITY, CITY_LONG_RUN_CAGR } from "./anchors";
import type { Asset, PriceConfidence } from "./rates";

export type Scenario = "conservative" | "base" | "optimistic";
export const SCENARIOS: Scenario[] = ["conservative", "base", "optimistic"];

export const FORECAST_VERSION = "market-v1";
export const BASE_YEAR = 2026;
export const HORIZON = 10;

export const ANCHOR_RATES: Record<Scenario, number> = {
  conservative: CITY.rbiAllIndiaHpiYoY.value,
  base: CITY.priceGrowthYoY.value,
  optimistic: CITY_LONG_RUN_CAGR,
};
const LAND_PREMIUM: Record<Scenario, number> = { conservative: 0, base: 1.5, optimistic: 3 };
const INFRA_MAX = 1.5;
const INFRA_HALF_LIFE_YEARS = 4;
const UNCERTAINTY = 1.5;
const RATE_CAP: [number, number] = [0, 16];

export interface ForecastInput {
  asset: Asset;
  /** 0–25 from the infra-intel scorer; null when unknown */
  infraScore: number | null;
  priceConfidence: PriceConfidence | null;
  /** Corridor price ÷ city reference price for the same asset; < 0.6 counts as early-stage */
  relativePrice: number | null;
}

export interface ScenarioSeries {
  /** Index per year, BASE_YEAR … BASE_YEAR + HORIZON (2026 = 100) */
  index: number[];
  cagr3: number;
  cagr5: number;
  cagr10: number;
}

export interface CorridorForecast {
  version: string;
  asset: Asset;
  baseYear: number;
  scenarios: Record<Scenario, ScenarioSeries>;
  inputs: {
    anchors: Record<Scenario, number>;
    landPremium: Record<Scenario, number>;
    infraPremium: number;
    widened: boolean;
    widenedBecause: string | null;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, n));

export function infraPremium(infraScore: number | null): number {
  if (infraScore == null) return 0;
  return r1(clamp((infraScore - 12.5) / 12.5, [-1, 1]) * INFRA_MAX);
}

export function forecastCorridor(input: ForecastInput): CorridorForecast {
  const land = input.asset === "plot" ? LAND_PREMIUM : { conservative: 0, base: 0, optimistic: 0 };
  const infra = infraPremium(input.infraScore);
  const widenedBecause =
    input.priceConfidence == null ? "no measured prices yet"
    : input.priceConfidence === "LOW" ? "few listings to measure prices from"
    : input.relativePrice != null && input.relativePrice < 0.6 ? "early-stage area — outcomes vary more"
    : null;
  const spread = widenedBecause ? UNCERTAINTY : 0;

  const scenarios = {} as Record<Scenario, ScenarioSeries>;
  for (const s of SCENARIOS) {
    const index = [100];
    for (let t = 1; t <= HORIZON; t++) {
      const fade = Math.pow(0.5, (t - 1) / INFRA_HALF_LIFE_YEARS);
      const widen = s === "optimistic" ? spread : s === "conservative" ? -spread : 0;
      const rate = clamp(ANCHOR_RATES[s] + land[s] + infra * fade + widen, RATE_CAP);
      index.push(index[t - 1] * (1 + rate / 100));
    }
    const cagr = (n: number) => r1((Math.pow(index[n] / 100, 1 / n) - 1) * 100);
    scenarios[s] = { index: index.map((v) => Math.round(v)), cagr3: cagr(3), cagr5: cagr(5), cagr10: cagr(10) };
  }

  return {
    version: FORECAST_VERSION,
    asset: input.asset,
    baseYear: BASE_YEAR,
    scenarios,
    inputs: { anchors: { ...ANCHOR_RATES }, landPremium: { ...land }, infraPremium: infra, widened: spread > 0, widenedBecause },
  };
}

/** % gain from BASE_YEAR after `years`, for a scenario. */
export const gainPct = (f: CorridorForecast, s: Scenario, years: 3 | 5 | 10) => f.scenarios[s].index[years] - 100;
