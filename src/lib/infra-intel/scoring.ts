/**
 * Dynamic corridor infra score (0-25), replacing the static
 * `Σ statusWeight × reImpactScore × 0.2` that saturated at three projects.
 *
 * Each project contributes
 *   distance-decay × stage weight × time-to-completion discount × impact/10
 *   × momentum boost (status upgrades in the last 90 days)
 *   × staleness factor (no verification for > 6 months slowly discounts)
 * and the corridor score is 25·(1 − e^(−1.5·Σ)), so every new project still
 * moves the needle a little but no corridor can max out on count alone.
 * CURVE = 1.5 was calibrated on the 12 seeded corridors (2026-09-22) so the
 * median stays near the old level (~19/25) while restoring spread (10-23).
 *
 * Stage weights and the time discount are shared with LandIQ's IPP pillar so
 * the corridor and village views agree.
 */
import { STATUS_WEIGHT } from '../landiq/pillars';
import { distanceToPolylineKm, haversineKm } from './geo';

export const INFRA_SCORE_MAX = 25;
const CURVE = 1.5;
const TIME_DISCOUNT_RATE = 0.12;
const STALE_AFTER_DAYS = 180;

const CATEGORY_BASE: Record<string, number> = {
  METRO_RAIL: 8,
  AIRPORT_AVIATION: 8,
  INDUSTRIAL_ZONE: 7,
  PHARMA_BIOTECH: 7,
  IT_TECH_PARK: 7,
  ROAD_HIGHWAY: 6,
  LOGISTICS_PARK: 6,
  TOWNSHIP: 6,
  UTILITY: 5,
  GOVT_APPROVAL: 4,
};

/** Model-derived 1-10 impact from category, size and money. */
export function computeImpact(p: {
  category: string;
  totalInvestmentCr?: number | null;
  totalLengthKm?: number | null;
  expectedJobs?: number | null;
}): number {
  let v = CATEGORY_BASE[p.category] ?? 5;
  const cr = p.totalInvestmentCr ?? null;
  if (cr !== null) {
    if (cr >= 10000) v += 2;
    else if (cr >= 2000) v += 1;
    else if (cr < 100) v -= 2;
    else if (cr < 500) v -= 1;
  }
  if ((p.totalLengthKm ?? 0) >= 100) v += 1;
  if ((p.expectedJobs ?? 0) >= 50000) v += 1;
  return Math.max(1, Math.min(10, Math.round(v)));
}

/** Years until completion from strings like "FY 2028-29", "Q4 2027", "Completed Q1 2026", "2030". */
export function yearsToCompletion(estimate: string | null | undefined, status: string, now = new Date()): number {
  if (status === 'COMPLETE') return 0;
  if (!estimate) return status === 'ANNOUNCED' ? 6 : status === 'APPROVED' ? 4 : 3;
  if (/complet/i.test(estimate)) return 0;
  const fy = estimate.match(/FY\s?(\d{4})(?:\s?-\s?(\d{2,4}))?/i);
  const q = estimate.match(/Q([1-4])\s?(\d{4})/i);
  const y = estimate.match(/(20\d{2})/);
  let target: Date | null = null;
  if (fy) target = new Date(Date.UTC(parseInt(fy[1], 10) + 1, 2, 31)); // FY ends 31 Mar next year
  else if (q) target = new Date(Date.UTC(parseInt(q[2], 10), parseInt(q[1], 10) * 3 - 1, 28));
  else if (y) target = new Date(Date.UTC(parseInt(y[1], 10), 11, 31));
  if (!target) return 3;
  return Math.max(0, (target.getTime() - now.getTime()) / (365.25 * 86400000));
}

export interface ProjectForScoring {
  id: string;
  name: string;
  status: string;
  category: string;
  impact: number; // 1-10
  impactRadiusKm: number;
  estimatedCompletion?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  route?: [number, number][] | null; // polyline for roads/metro
  listedForCorridor: boolean; // corridor slug appears in affectedCorridorSlugs
  statusUpgrades90d: number;
  lastVerifiedAt?: Date | null;
}

export interface Contribution {
  projectId: string;
  name: string;
  status: string;
  distanceKm: number | null;
  contribution: number;
  momentum: number;
  stale: boolean;
}

/** Distance from the corridor centroid; null means "not near enough to count". */
export function projectDistanceKm(p: ProjectForScoring, lat: number | null, lng: number | null): number | null {
  if (lat !== null && lng !== null) {
    let d: number | null = null;
    if (p.route && p.route.length > 1) d = distanceToPolylineKm(lat, lng, p.route);
    else if (p.latitude != null && p.longitude != null) d = haversineKm(lat, lng, p.latitude, p.longitude);
    // An admin explicitly tied this project to the corridor: never treat it as far away.
    if (d !== null) return p.listedForCorridor ? Math.min(d, p.impactRadiusKm * 0.5) : d;
  }
  // No geometry: trust the admin-curated corridor list, assume it is close.
  return p.listedForCorridor ? p.impactRadiusKm * 0.3 : null;
}

export function projectContribution(p: ProjectForScoring, distanceKm: number, now = new Date()): Contribution {
  const stage = STATUS_WEIGHT[p.status] ?? 0;
  const distanceFactor = Math.exp(-distanceKm / Math.max(p.impactRadiusKm, 0.1));
  const timeDiscount = 1 / (1 + TIME_DISCOUNT_RATE * yearsToCompletion(p.estimatedCompletion, p.status, now));
  const impact = Math.max(0, Math.min(1, p.impact / 10));
  const momentum = 1 + 0.15 * Math.min(3, Math.max(0, p.statusUpgrades90d));
  let staleness = 1;
  let stale = false;
  if (p.lastVerifiedAt && p.status !== 'COMPLETE') {
    const days = (now.getTime() - p.lastVerifiedAt.getTime()) / 86400000;
    if (days > STALE_AFTER_DAYS) {
      stale = true;
      staleness = Math.max(0.6, 1 - ((days - STALE_AFTER_DAYS) / 365) * 0.4);
    }
  }
  return {
    projectId: p.id,
    name: p.name,
    status: p.status,
    distanceKm: Math.round(distanceKm * 10) / 10,
    contribution: Math.round(distanceFactor * stage * timeDiscount * impact * momentum * staleness * 1000) / 1000,
    momentum: p.statusUpgrades90d,
    stale,
  };
}

export interface CorridorInfraResult {
  infraScore: number;
  raw: number;
  drivers: Contribution[];
}

/** Projects further than this many impact radii are ignored. */
const MAX_RADII = 3;

export function corridorInfraScore(
  projects: ProjectForScoring[],
  centroid: { lat: number | null; lng: number | null },
  now = new Date(),
): CorridorInfraResult {
  const drivers: Contribution[] = [];
  for (const p of projects) {
    const d = projectDistanceKm(p, centroid.lat, centroid.lng);
    if (d === null) continue;
    if (d > p.impactRadiusKm * MAX_RADII && !p.listedForCorridor) continue;
    const c = projectContribution(p, d, now);
    if (c.contribution > 0) drivers.push(c);
  }
  drivers.sort((a, b) => b.contribution - a.contribution);
  const raw = drivers.reduce((s, c) => s + c.contribution, 0);
  return {
    infraScore: Math.round(INFRA_SCORE_MAX * (1 - Math.exp(-CURVE * raw))),
    raw: Math.round(raw * 1000) / 1000,
    drivers: drivers.slice(0, 8),
  };
}
