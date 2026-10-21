/**
 * Shared enum → presentation mappings for the v2 client design system.
 * Keeps heat / cycle / sentiment / risk styling consistent across every card.
 * Enum values mirror prisma/schema.prisma exactly.
 */

export type HeatRating = "FIRE" | "VERY_HOT" | "HOT" | "WARM" | "EMERGING" | "EARLY";
export type InvCycle = "ACT_NOW" | "MID_CYCLE" | "WATCH_AND_BUY" | "PATIENT_CAPITAL";
export type Sentiment = "BULLISH" | "NEUTRAL" | "CAUTIOUS";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** A styling recipe expressed with the v2 CSS variables. */
export interface Tone {
  label: string;
  emoji?: string;
  /** inline styles for a filled pill */
  bg: string;
  fg: string;
}

// ── Heat rating (spec 5.6) ──────────────────────────────────
export const HEAT: Record<HeatRating, Tone> = {
  FIRE:     { label: "Fire",     emoji: "🔥", bg: "var(--color-alert)",        fg: "#fff" },
  VERY_HOT: { label: "Very Hot", emoji: "🔥", bg: "var(--color-alert)",        fg: "#fff" },
  HOT:      { label: "Hot",      emoji: "🔥", bg: "var(--color-saffron)",      fg: "var(--color-ink)" },
  WARM:     { label: "Warm",     emoji: "☀️", bg: "var(--color-caution-wash)", fg: "#9A6A1E" },
  EMERGING: { label: "Emerging", emoji: "🌱", bg: "var(--color-navy-wash)",    fg: "var(--color-navy-ink)" },
  EARLY:    { label: "Early",    emoji: "🌱", bg: "var(--color-navy-wash)",    fg: "var(--color-navy-ink)" },
};

// ── Investment cycle (filter chips) ─────────────────────────
// Timing stage from the nearby infrastructure pipeline (src/lib/market/narrative.ts cycleFor):
// what stage the projects are at, not advice on when to buy.
export const CYCLE: Record<InvCycle, { label: string; emoji?: string; explain: string }> = {
  ACT_NOW:         { label: "Infra starting soon", explain: "Nearby infrastructure is approved and due within about 3 years, not yet under construction." },
  MID_CYCLE:       { label: "Infra under way",     explain: "Nearby infrastructure is under construction, partly open or complete." },
  WATCH_AND_BUY:   { label: "Infra 3–6 yrs out",   explain: "The nearest major project is approved or announced, 3–6 years from completion." },
  PATIENT_CAPITAL: { label: "Long horizon",        explain: "No nearby infrastructure under way, or completion further out." },
};

// ── Investor sentiment ──────────────────────────────────────
export const SENTIMENT: Record<Sentiment, Tone> = {
  BULLISH:  { label: "Bullish",  emoji: "▲", bg: "var(--color-growth-wash)",  fg: "var(--color-growth)" },
  NEUTRAL:  { label: "Neutral",  emoji: "▬", bg: "var(--color-caution-wash)", fg: "#9A6A1E" },
  CAUTIOUS: { label: "Cautious", emoji: "▼", bg: "var(--color-alert-wash)",   fg: "var(--color-alert)" },
};

// ── Risk level ──────────────────────────────────────────────
export const RISK: Record<RiskLevel, Tone> = {
  LOW:    { label: "Low Risk",    bg: "var(--color-growth-wash)",  fg: "var(--color-growth)" },
  MEDIUM: { label: "Medium Risk", bg: "var(--color-caution-wash)", fg: "#9A6A1E" },
  HIGH:   { label: "High Risk",   bg: "var(--color-alert-wash)",   fg: "var(--color-alert)" },
};

/** Map an overallScore (0-100) to a heat colour for choropleth / rings. */
export function scoreColor(score: number): string {
  if (score >= 85) return "var(--color-saffron-deep)";
  if (score >= 70) return "var(--color-saffron)";
  if (score >= 55) return "var(--color-caution)";
  if (score >= 40) return "var(--color-navy-ink)";
  return "var(--color-text-lo)";
}
