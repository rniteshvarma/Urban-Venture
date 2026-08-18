/**
 * LANDIQ composite scorer (LANDIQ spec, Part 3.2-3.3). Pure functions.
 *
 *   LandIQ = ( Σ pillar_p × weight_p[horizon] ) × (RSK / 100)^rskExponent
 *
 * RSK is a MULTIPLIER, not an additive term: √-dampening means moderate risk
 * reduces the score proportionately while severe risk (RSK < ~40) collapses it.
 * The cross-sectional pillar normalisation (IPP min-max, PMV z-blend) lives in
 * scoreUniverse — pillar scores are only comparable relative to a population.
 */

import { computeStats, zScore, normalise0to100, zTo100, clamp, type Stats } from './stats';
import { ippRaw, computePmvSignals, rztScore, rskScore, type InfraExposure, type PmvInput, type RztInput, type RiskFlagInput } from './pillars';
import type { WeightProfile, PillarKey } from './weight-profiles';

export interface PillarScores {
  IPP: number;
  PMV: number;
  TVL: number;
  EEG: number;
  DEV: number;
  RZT: number;
  DEM: number;
  RSK: number; // multiplier pillar, 0-100
}

const NEUTRAL = 50; // Phase-1 placeholder for pillars without data yet (TVL/EEG/DEV/DEM)

/** Composite LandIQ 0-100 from pillar scores + a weight profile. */
export function compositeScore(p: PillarScores, profile: WeightProfile): number {
  const summed: PillarKey[] = ['IPP', 'PMV', 'TVL', 'EEG', 'DEV', 'RZT', 'DEM'];
  const weighted = summed.reduce((acc, k) => acc + p[k] * profile.weights[k], 0);
  const multiplier = (clamp(p.RSK, 0, 100) / 100) ** profile.rskExponent;
  return Math.round(clamp(weighted * multiplier, 0, 100));
}

export interface ConvictionInput {
  coverage: number; // 0-1: share of 8 pillars with in-date inputs
  freshness: number; // 0-1: weighted recency of underlying observations
  sampleCount: number; // registrations backing the price estimate
  pillarScores: number[]; // for agreement (low variance = high agreement)
}

/** Conviction 0-100 — data quality, published alongside every score. */
export function conviction(x: ConvictionInput): number {
  const coverage = clamp(x.coverage, 0, 1);
  const freshness = clamp(x.freshness, 0, 1);
  const sampleSize = clamp(Math.log10(x.sampleCount + 1) / 2, 0, 1); // ~100 samples → 1
  const spread = Math.sqrt(computeStats(x.pillarScores).std ** 2) / 50; // 0-100 scores → /50
  const agreement = clamp(1 - spread, 0, 1);
  return Math.round(100 * (0.35 * coverage + 0.25 * freshness + 0.25 * sampleSize + 0.15 * agreement));
}

// ── Entry-window classification ──────────────────────────────────────────────

export type EntryWindow = 'ACT_NOW' | 'ACCUMULATE' | 'WATCH' | 'FAIRLY_PRICED' | 'AVOID';

export interface EntryWindowInput {
  landIQScore: number;
  rsk: number;
  ippScore: number;
  hasSevereRisk: boolean;
  cagr3y: number; // momentum
  accel: number; // acceleration
  valueGap: number; // >0 = undervalued vs peers
  nearestCatalystYears: number | null; // years to nearest high-impact infra completion
  conviction: number;
}

export function classifyEntryWindow(x: EntryWindowInput): EntryWindow {
  if (x.rsk < 40 || x.hasSevereRisk || x.cagr3y < 0) return 'AVOID';
  if (x.conviction < 40) return 'WATCH'; // too thin to act on
  const catalystSoon = x.nearestCatalystYears != null && x.nearestCatalystYears <= 2;
  if (x.valueGap > 0.1 && x.accel > 0 && catalystSoon) return 'ACT_NOW';
  if (x.ippScore >= 60 && x.valueGap >= -0.05) return 'ACCUMULATE';
  if (x.valueGap < -0.05) return 'FAIRLY_PRICED'; // upside already captured
  return 'WATCH';
}

// ── Cross-sectional universe scoring ─────────────────────────────────────────

export interface VillageInput {
  villageId: string;
  exposures: InfraExposure[]; // IPP
  pmv: PmvInput; // PMV
  rzt: RztInput; // RZT
  risks: RiskFlagInput[]; // RSK
  // Phase-1 placeholders — supply real 0-100 scores as pillars come online.
  tvl?: number | null;
  eeg?: number | null;
  dev?: number | null;
  dem?: number | null;
  // Conviction inputs
  coverage?: number;
  freshness?: number;
  sampleCount?: number;
}

export interface ScoredVillage {
  villageId: string;
  landIQScore: number;
  pillars: PillarScores;
  conviction: number;
  entryWindow: EntryWindow;
  topDrivers: Array<{ pillar: string; contribution: number }>;
}

/**
 * Score a whole village universe. Pillars that require cross-sectional context
 * (IPP min-max, PMV z-blend) are normalised here across the population, then the
 * composite + entry window are computed per village.
 */
export function scoreUniverse(villages: VillageInput[], profile: WeightProfile): ScoredVillage[] {
  if (villages.length === 0) return [];

  // IPP: raw → min-max 0-100 across population.
  const ippRaws = villages.map((v) => ippRaw(v.exposures));
  const ippStats = computeStats(ippRaws);

  // PMV: per-village signals → z-score each component across population → blend.
  const signals = villages.map((v) => computePmvSignals(v.pmv));
  const cagrStats = computeStats(signals.map((s) => s.cagr3y));
  const accelStats = computeStats(signals.map((s) => s.accel));
  const valueGapStats = computeStats(signals.map((s) => s.valueGap));
  const circleStats = computeStats(signals.map((s) => s.circleSpread));

  return villages.map((v, i) => {
    const ipp = Math.round(normalise0to100(ippRaws[i], ippStats.min, ippStats.max));

    const s = signals[i];
    const momentumRaw = 0.6 * zScore(s.cagr3y, cagrStats) + 0.4 * zScore(s.accel, accelStats);
    const valueRaw = 0.7 * zScore(s.valueGap, valueGapStats) + 0.3 * zScore(-s.circleSpread, negate(circleStats));
    const pmv = Math.round(zTo100(0.5 * momentumRaw + 0.5 * valueRaw));

    const rzt = rztScore(v.rzt);
    const rsk = rskScore(v.risks);

    const pillars: PillarScores = {
      IPP: ipp,
      PMV: pmv,
      TVL: clampScore(v.tvl),
      EEG: clampScore(v.eeg),
      DEV: clampScore(v.dev),
      RZT: rzt,
      DEM: clampScore(v.dem),
      RSK: rsk,
    };

    const landIQScore = compositeScore(pillars, profile);

    // Conviction — Phase 1 coverage defaults to the 4 real pillars of 8.
    const realPillars = [ipp, pmv, rzt, rsk];
    const conv = conviction({
      coverage: v.coverage ?? 0.5,
      freshness: v.freshness ?? 0.7,
      sampleCount: v.sampleCount ?? 0,
      pillarScores: realPillars,
    });

    const nearestCatalystYears = v.exposures.length
      ? Math.min(...v.exposures.filter((e) => e.reImpactScore >= 6).map((e) => e.yearsToCompletion).concat(Infinity))
      : null;

    const entryWindow = classifyEntryWindow({
      landIQScore,
      rsk,
      ippScore: ipp,
      hasSevereRisk: v.risks.some((r) => r.severity === 'RED'),
      cagr3y: s.cagr3y,
      accel: s.accel,
      valueGap: s.valueGap,
      nearestCatalystYears: nearestCatalystYears === Infinity ? null : nearestCatalystYears,
      conviction: conv,
    });

    const topDrivers = (['IPP', 'PMV', 'TVL', 'EEG', 'DEV', 'RZT', 'DEM'] as PillarKey[])
      .map((k) => ({ pillar: k, contribution: pillars[k] * profile.weights[k] }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);

    return { villageId: v.villageId, landIQScore, pillars, conviction: conv, entryWindow, topDrivers };
  });
}

function clampScore(v: number | null | undefined): number {
  return v == null ? NEUTRAL : clamp(v, 0, 100);
}

/** circleSpread is inverted in the value signal; z on -spread needs a stats obj with mean negated. */
function negate(stats: Stats): Stats {
  return { ...stats, mean: -stats.mean, min: -stats.max, max: -stats.min };
}
