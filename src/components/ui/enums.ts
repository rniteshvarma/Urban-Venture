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
export const CYCLE: Record<InvCycle, { label: string; emoji?: string }> = {
  ACT_NOW:         { label: "Act Now", emoji: "🔥" },
  MID_CYCLE:       { label: "Mid-Cycle" },
  WATCH_AND_BUY:   { label: "Watch & Buy" },
  PATIENT_CAPITAL: { label: "Patient Capital" },
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
