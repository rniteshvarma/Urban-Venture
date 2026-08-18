/**
 * Horizon weight profiles (LANDIQ spec, Part 3.2). These are the defaults that
 * seed the tunable, versioned ScoringWeightProfile table. RSK is NOT in the
 * weighted sum — it is applied as a multiplier by the scorer.
 */

export type PillarKey = 'IPP' | 'PMV' | 'TVL' | 'EEG' | 'DEV' | 'RZT' | 'DEM';

export interface WeightProfile {
  name: string;
  label: string;
  horizonYearsMin: number;
  horizonYearsMax: number | null;
  weights: Record<PillarKey, number>;
  rskExponent: number;
}

export const WEIGHT_PROFILES: WeightProfile[] = [
  {
    name: 'TRADER_1_3Y',
    label: 'Trader (1-3 yr)',
    horizonYearsMin: 1,
    horizonYearsMax: 3,
    weights: { IPP: 0.15, PMV: 0.28, TVL: 0.22, EEG: 0.1, DEV: 0.15, RZT: 0.06, DEM: 0.04 },
    rskExponent: 0.5,
  },
  {
    name: 'BALANCED_3_5Y',
    label: 'Balanced (3-5 yr)',
    horizonYearsMin: 3,
    horizonYearsMax: 5,
    weights: { IPP: 0.22, PMV: 0.2, TVL: 0.15, EEG: 0.15, DEV: 0.15, RZT: 0.08, DEM: 0.05 },
    rskExponent: 0.5,
  },
  {
    name: 'BUILDER_5_10Y',
    label: 'Builder (5-10 yr)',
    horizonYearsMin: 5,
    horizonYearsMax: 10,
    weights: { IPP: 0.28, PMV: 0.12, TVL: 0.08, EEG: 0.2, DEV: 0.14, RZT: 0.1, DEM: 0.08 },
    rskExponent: 0.5,
  },
  {
    name: 'LEGACY_10Y',
    label: 'Legacy (10+ yr)',
    horizonYearsMin: 10,
    horizonYearsMax: null,
    weights: { IPP: 0.3, PMV: 0.08, TVL: 0.05, EEG: 0.22, DEV: 0.1, RZT: 0.12, DEM: 0.13 },
    rskExponent: 0.5,
  },
];

export const DEFAULT_PROFILE = WEIGHT_PROFILES[1]; // Balanced

/** Pick the profile whose horizon band contains `years` (nearest if out of range). */
export function profileForHorizon(years: number): WeightProfile {
  for (const p of WEIGHT_PROFILES) {
    if (years >= p.horizonYearsMin && (p.horizonYearsMax == null || years <= p.horizonYearsMax)) {
      return p;
    }
  }
  return years < WEIGHT_PROFILES[0].horizonYearsMin ? WEIGHT_PROFILES[0] : WEIGHT_PROFILES[WEIGHT_PROFILES.length - 1];
}

export function profileByName(name: string): WeightProfile | undefined {
  return WEIGHT_PROFILES.find((p) => p.name === name);
}
