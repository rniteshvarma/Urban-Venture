/**
 * Auto-apply policy — the "decide automatically, but keep learning" loop.
 *
 *   decisionScore = confidence × (0.5 + 0.5·sourceTrust) × matchFactor × corroboration
 *
 * A signal is auto-applied when decisionScore ≥ the threshold for its
 * (eventType × source tier). Both inputs are LEARNED from admin outcomes:
 *   - source trust is a Beta posterior over approve / implicit-ok vs reject / revert
 *   - thresholds drift up on reverts (we were too eager) and down on approvals
 *     of queued items that scored close to the line (we were too cautious)
 *
 * Hard guards always queue, whatever the score: cancellations, delays, status
 * regressions, and uncorroborated new projects from search aggregators.
 * Everything here is pure; the DB side lives in pipeline.ts / feedback.ts.
 */
import type { EventType } from './text';

export type SourceTier = 'OFFICIAL' | 'NEWS' | 'AGGREGATOR';
export type Decision = 'AUTO_APPLIED' | 'QUEUED' | 'IGNORED';
export type Outcome = 'APPROVED' | 'REJECTED' | 'REVERTED' | 'IMPLICIT_OK';

export const MIN_MATCH = 0.75;
export const THRESHOLD_MIN = 0.4;
export const THRESHOLD_MAX = 0.95;
/** Auto-applied signals not reverted within this window count as implicitly correct. */
export const IMPLICIT_OK_DAYS = 14;

const TIER_BASE: Record<SourceTier, number> = { OFFICIAL: 0.5, NEWS: 0.58, AGGREGATOR: 0.64 };

const EVENT_ADJ: Record<EventType, number> = {
  NEW_PROJECT: 0.08,
  STATUS_CHANGE: 0.03,
  COMPLETION: 0.03,
  LAND_ACQUISITION: 0.0,
  TENDER: 0.0,
  BUDGET: 0.0,
  PROGRESS_UPDATE: -0.03,
  MILESTONE: -0.05,
  DELAY: 0.05,
  OTHER: 0.1,
};

export function defaultThreshold(event: EventType, tier: SourceTier): number {
  return clamp(TIER_BASE[tier] + EVENT_ADJ[event], THRESHOLD_MIN, THRESHOLD_MAX);
}

export function policyKey(event: EventType, tier: SourceTier): string {
  return `${event}:${tier}`;
}

/** Beta prior pseudo-counts (successes, failures) by tier. */
export const TRUST_PRIOR: Record<SourceTier, [number, number]> = {
  OFFICIAL: [8, 2],
  NEWS: [6, 4],
  AGGREGATOR: [5, 5],
};

export interface OutcomeCounts {
  approved: number;
  implicitOk: number;
  rejected: number;
  reverted: number;
}

/** Posterior mean trust ∈ (0,1). A revert weighs more than a reject: it reached customers. */
export function computeTrust(tier: SourceTier, c: OutcomeCounts): number {
  const [a0, b0] = TRUST_PRIOR[tier];
  const good = c.approved + 0.5 * c.implicitOk;
  const bad = c.rejected + 1.5 * c.reverted;
  return (a0 + good) / (a0 + b0 + good + bad);
}

export interface DecisionInput {
  eventType: EventType;
  tier: SourceTier;
  confidence: number; // 0-100
  sourceTrust: number; // 0-1
  isNewProject: boolean;
  matchScore: number; // 0-1, ignored for new projects
  corroboration: number; // distinct sources agreeing (≥1)
  hasDelta: boolean; // would applying change anything?
  statusRegression: boolean;
  proposedStatus: string | null;
  zone: string | null;
  threshold: number;
}

export interface DecisionResult {
  decision: Decision;
  score: number;
  reason: string;
}

export function decide(x: DecisionInput): DecisionResult {
  const matchFactor = x.isNewProject ? 1 : clamp(x.matchScore, 0, 1);
  const corroborationBoost = Math.min(1.25, 1 + 0.1 * Math.max(0, x.corroboration - 1));
  const score = round3(clamp(x.confidence / 100, 0, 1) * (0.5 + 0.5 * clamp(x.sourceTrust, 0, 1)) * matchFactor * corroborationBoost);

  if (x.zone === 'OUTSIDE') return { decision: 'IGNORED', score, reason: 'Outside Telangana' };
  if (!x.hasDelta) return { decision: 'IGNORED', score, reason: 'No change to apply (already known)' };
  if (!x.isNewProject && x.matchScore < MIN_MATCH) {
    return { decision: 'QUEUED', score, reason: `Weak project match (${Math.round(x.matchScore * 100)}%) — confirm which project this is` };
  }
  if (x.proposedStatus === 'CANCELLED') return { decision: 'QUEUED', score, reason: 'Cancellation — always reviewed' };
  if (x.eventType === 'DELAY' || x.proposedStatus === 'DELAYED') return { decision: 'QUEUED', score, reason: 'Delay — always reviewed (changes stage weight sharply)' };
  if (x.statusRegression) return { decision: 'QUEUED', score, reason: 'Status would move backwards — always reviewed' };
  if (x.isNewProject && x.tier === 'AGGREGATOR' && x.corroboration < 2) {
    return { decision: 'QUEUED', score, reason: 'New project from search results with a single source — needs corroboration' };
  }
  if (score >= x.threshold) {
    return { decision: 'AUTO_APPLIED', score, reason: `Score ${score.toFixed(2)} ≥ learned threshold ${x.threshold.toFixed(2)}` };
  }
  return { decision: 'QUEUED', score, reason: `Score ${score.toFixed(2)} < learned threshold ${x.threshold.toFixed(2)}` };
}

/**
 * Move a threshold after an outcome.
 *  - REVERTED: we auto-applied something wrong → +0.05
 *  - APPROVED (of a queued item) scoring within 0.15 of the line → −0.015 (too cautious)
 *  - IMPLICIT_OK: auto-applied and survived the grace window → −0.004
 *  - REJECTED (of a queued item): the queue did its job; nudge up only if the score was above the line
 */
export function nextThreshold(current: number, outcome: Outcome, signalScore: number, thresholdAtDecision: number): number {
  let t = current;
  switch (outcome) {
    case 'REVERTED':
      t += 0.05;
      break;
    case 'APPROVED':
      if (signalScore >= thresholdAtDecision - 0.15) t -= 0.015;
      break;
    case 'IMPLICIT_OK':
      t -= 0.004;
      break;
    case 'REJECTED':
      if (signalScore >= thresholdAtDecision) t += 0.02;
      break;
  }
  return round3(clamp(t, THRESHOLD_MIN, THRESHOLD_MAX));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
