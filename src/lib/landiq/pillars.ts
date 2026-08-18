/**
 * LANDIQ pillar calculators (LANDIQ spec, Part 3.1). Pure functions.
 *
 * Each pillar produces a per-village RAW signal; the scorer (scorer.ts)
 * normalises raws across the population into comparable 0-100 pillar scores.
 * Phase 1 pillars: IPP, PMV, RZT, RSK.
 */

import { clamp } from './stats';

// ── P1 · Infrastructure Proximity & Pipeline (IPP) ───────────────────────────

/** Status weight — an ANNOUNCED project must score far below one COMPLETE. */
export const STATUS_WEIGHT: Record<string, number> = {
  COMPLETE: 1.0,
  PARTIALLY_COMPLETE: 0.92,
  UNDER_CONSTRUCTION: 0.85,
  APPROVED: 0.65,
  LAND_ACQUISITION: 0.45,
  ANNOUNCED: 0.25,
  DELAYED: 0.15,
  CANCELLED: 0,
};

const TIME_DISCOUNT_RATE = 0.12;

export interface InfraExposure {
  status: string;
  distanceKm: number;
  impactRadiusKm: number;
  yearsToCompletion: number; // 0 if already complete
  reImpactScore: number; // 1-10
}

/** Contribution of one infrastructure project to a village's IPP. */
export function ippContribution(x: InfraExposure): number {
  const distanceFactor = Math.exp(-x.distanceKm / Math.max(x.impactRadiusKm, 0.1));
  const statusWeight = STATUS_WEIGHT[x.status] ?? 0;
  const timeDiscount = 1 / (1 + TIME_DISCOUNT_RATE * Math.max(0, x.yearsToCompletion));
  const impactWeight = clamp(x.reImpactScore / 10, 0, 1);
  return distanceFactor * statusWeight * timeDiscount * impactWeight;
}

/**
 * Raw IPP for a village: diminishing-returns sum of its contributions,
 * 1 - e^(-Σ) ∈ [0, 1). Normalised to 0-100 across the state by the scorer.
 */
export function ippRaw(exposures: InfraExposure[]): number {
  const sum = exposures.reduce((acc, x) => acc + ippContribution(x), 0);
  return 1 - Math.exp(-sum);
}

// ── P2 · Price Momentum & Value (PMV) — per-village sub-signals ───────────────

/** Compound annual growth rate; 0 when the base price is missing/zero. */
export function cagr(priceNow: number, priceThen: number, years: number): number {
  if (priceThen <= 0 || years <= 0 || priceNow <= 0) return 0;
  return (priceNow / priceThen) ** (1 / years) - 1;
}

export interface PmvInput {
  priceNow: number;
  price1yAgo?: number | null;
  price3yAgo?: number | null;
  peerMedianPrice?: number | null; // median of same-district, similar-IPP villages
  circleRate?: number | null;
  marketPrice?: number | null;
}

export interface PmvSignals {
  cagr3y: number;
  accel: number; // cagr1y - cagr3y: is growth speeding up?
  valueGap: number; // (peer - price)/peer: higher = cheaper vs peers
  circleSpread: number; // (market - circle)/circle
}

/** Per-village PMV sub-signals; z-scored and blended across the population by the scorer. */
export function computePmvSignals(x: PmvInput): PmvSignals {
  const cagr3y = x.price3yAgo ? cagr(x.priceNow, x.price3yAgo, 3) : 0;
  const cagr1y = x.price1yAgo ? cagr(x.priceNow, x.price1yAgo, 1) : cagr3y;
  const accel = cagr1y - cagr3y;
  const valueGap =
    x.peerMedianPrice && x.peerMedianPrice > 0
      ? (x.peerMedianPrice - x.priceNow) / x.peerMedianPrice
      : 0;
  const circleSpread =
    x.circleRate && x.circleRate > 0 && x.marketPrice
      ? (x.marketPrice - x.circleRate) / x.circleRate
      : 0;
  return { cagr3y, accel, valueGap, circleSpread };
}

// ── P6 · Regulatory & Zoning Tailwind (RZT) ──────────────────────────────────

/** Master-plan zone score — also the HARD CEILING for RZT. */
export const MASTERPLAN_SCORE: Array<[RegExp, number]> = [
  [/water|ftl|lake/i, 0],
  [/green|conserv|forest|eco/i, 10],
  [/agri/i, 55],
  [/indus/i, 70],
  [/commerc/i, 80],
  [/mixed/i, 85],
  [/resid|r1|r2/i, 100],
];

export function masterPlanScore(zone?: string | null): number {
  if (!zone) return 60; // unknown → neutral, no ceiling penalty
  for (const [re, score] of MASTERPLAN_SCORE) if (re.test(zone)) return score;
  return 60;
}

export interface RztInput {
  underHMDA?: boolean;
  underGHMC?: boolean;
  underFCDA?: boolean;
  underUDA?: string | null;
  jurisdictionRecencyMonths?: number | null; // months since inclusion; recent = uplift
  masterPlanZone?: string | null;
  goEventsScore?: number; // 0-100, favourable GO notifications, 12m
}

/**
 * RZT with the master-plan hard ceiling: a Conservation/Water village cannot be
 * rescued above its zone score no matter how strong jurisdiction/GO signals are.
 */
export function rztScore(x: RztInput): number {
  const hasJurisdiction = !!(x.underHMDA || x.underGHMC || x.underFCDA || x.underUDA);
  let jurisdictionScore = hasJurisdiction ? 70 : 40;
  if (hasJurisdiction && x.jurisdictionRecencyMonths != null && x.jurisdictionRecencyMonths <= 12) {
    jurisdictionScore = 100; // uplift lands on notification
  }
  const mps = masterPlanScore(x.masterPlanZone);
  const goScore = clamp(x.goEventsScore ?? 0, 0, 100);

  const blended = 0.5 * jurisdictionScore + 0.3 * mps + 0.2 * goScore;
  return Math.round(clamp(Math.min(blended, mps), 0, 100)); // hard ceiling = master-plan score
}

// ── P8 · Risk & Encumbrance (RSK) — inverse pillar ───────────────────────────

/** Penalty by canonical flag type (LANDIQ 3.1). */
export const RISK_PENALTY: Record<string, number> = {
  SECTION_22A: 25,
  ASSIGNED_LAND: 20,
  ENDOWMENT: 20,
  WAKF: 20,
  FOREST: 20,
  FTL_BUFFER: 15,
  GO_111: 15,
  AIR_FUNNEL: 10,
  LITIGATION: 15,
  MUTATION_DISPUTE: 10,
  ASSIGNED_CONVERSION: 10,
  ACQUISITION_OVERLAP: 20,
};

const SEVERITY_PENALTY: Record<string, number> = { RED: 20, ORANGE: 12, YELLOW: 6, GREEN: 0 };

export interface RiskFlagInput {
  flagType: string;
  severity?: string;
}

/** RSK = max(0, 100 - Σ penalties). Applied as a multiplier by the scorer, not additively. */
export function rskScore(flags: RiskFlagInput[]): number {
  const penalty = flags.reduce((acc, f) => {
    const known = RISK_PENALTY[f.flagType];
    return acc + (known ?? SEVERITY_PENALTY[f.severity ?? 'YELLOW'] ?? 6);
  }, 0);
  return Math.max(0, 100 - penalty);
}
