/**
 * Statistical primitives for the LANDIQ scorer (LANDIQ spec, Part 3).
 * Pure functions — cross-sectional z-scores, medians, and 0-100 normalisation
 * used to turn per-village raw signals into comparable pillar scores.
 */

export interface Stats {
  mean: number;
  std: number;
  min: number;
  max: number;
  n: number;
}

export function computeStats(values: number[]): Stats {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, min: 0, max: 0, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values), n };
}

/** z-score; returns 0 when the population has no spread (avoids divide-by-zero). */
export function zScore(value: number, stats: Stats): number {
  return stats.std === 0 ? 0 : (value - stats.mean) / stats.std;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Clamp to [lo, hi]. */
export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Min-max normalise a value into 0-100 across a population range. */
export function normalise0to100(value: number, min: number, max: number): number {
  if (max === min) return 50; // no spread → neutral midpoint
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

/**
 * Map a z-score into 0-100 via the logistic CDF, so extreme outliers saturate
 * rather than blowing out a linear min-max scale. z=0 → 50, z=+2 → ~88.
 */
export function zTo100(z: number): number {
  return clamp(100 / (1 + Math.exp(-z * 1.1)), 0, 100);
}

/** Normalise a whole array to 0-100 by min-max; returns per-index scores. */
export function normaliseArray0to100(values: number[]): number[] {
  const { min, max } = computeStats(values);
  return values.map((v) => normalise0to100(v, min, max));
}
