/**
 * Corridor score components that come from measured data. Each is 0–25 and
 * the overall score is their sum (the infra component is computed by
 * infra-intel/scoring.ts).
 *
 *   approvalScore      "RERA-registered projects" — how many TG-RERA projects
 *                      we track within the corridor's radius (log scale)
 *   demandScore        "Developer activity" — projects still under
 *                      construction or newly launched (log scale)
 *   appreciationScore  "Growth outlook" — the base-case 5-year growth rate
 *                      from forecast.ts, 4% a year → 0, 12% → 25
 *
 * These replace inputs that used to come from synthetic tables (absorption,
 * portal searches, a made-up price history). Pure: tested in market.test.ts.
 */

const logScale = (n: number, full: number) => Math.round(25 * Math.min(1, Math.log1p(Math.max(0, n)) / Math.log1p(full)));

export const SCORE_LABELS = {
  infraScore: "Infrastructure",
  approvalScore: "RERA-registered projects",
  demandScore: "Developer activity",
  appreciationScore: "Growth outlook",
} as const;

export function marketScores(input: { infraScore: number; reraProjects: number; activeProjects: number; baseCagr5: number | null }) {
  const approvalScore = logScale(input.reraProjects, 60);
  const demandScore = logScale(input.activeProjects, 40);
  const appreciationScore = input.baseCagr5 == null ? 0 : Math.round(Math.min(25, Math.max(0, ((input.baseCagr5 - 4) / 8) * 25)));
  const overallScore = Math.round(input.infraScore) + approvalScore + demandScore + appreciationScore;
  const sentiment: "BULLISH" | "NEUTRAL" | "CAUTIOUS" = overallScore >= 70 ? "BULLISH" : overallScore < 45 ? "CAUTIOUS" : "NEUTRAL";
  return { approvalScore, demandScore, appreciationScore, overallScore, sentiment };
}
