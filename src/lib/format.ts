/**
 * Indian formatting conventions — v2 client redesign (Part 3 of the spec).
 *
 * Use these helpers EVERYWHERE prices, areas, percentages, dates, EMIs or
 * phone numbers are rendered on the client-facing portal. This is the single
 * biggest thing that makes the product feel native to Indian property buyers.
 *
 * Money helpers take RUPEES unless the name says otherwise. Several DB fields
 * (e.g. project.minBudgetLakhs) are already in Lakh — use `formatLakh` /
 * `lakhToRupees` for those.
 */

// ─────────────────────────────────────────────────────────────
// Currency
// ─────────────────────────────────────────────────────────────

const LAKH = 100_000;
const CRORE = 10_000_000;

/** Group an integer with the Indian system: last 3 digits, then pairs. 1234567 → "12,34,567" */
export function groupIndian(n: number): string {
  const neg = n < 0;
  const digits = Math.round(Math.abs(n)).toString();
  let out: string;
  if (digits.length <= 3) {
    out = digits;
  } else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return neg ? "-" + out : out;
}

/** Trim a trailing ".00" / ".0" but keep meaningful decimals. 1.25 → "1.25", 25.0 → "25" */
function trimDecimal(n: number, maxFraction = 2): string {
  const fixed = n.toFixed(maxFraction);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Compact Indian currency from RUPEES.
 *   formatINR(2500000)  → "₹25 Lakh"
 *   formatINR(12500000) → "₹1.25 Cr"
 *   formatINR(4500)     → "₹4,500"
 */
export function formatINR(rupees: number | null | undefined): string {
  if (rupees == null || Number.isNaN(rupees)) return "—";
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "-" : "";
  if (abs >= CRORE) return `${sign}₹${trimDecimal(abs / CRORE)} Cr`;
  if (abs >= LAKH) return `${sign}₹${trimDecimal(abs / LAKH)} Lakh`;
  return `${sign}₹${groupIndian(abs)}`;
}

/** Compact currency from a value already expressed in LAKH. formatLakh(58) → "₹58 Lakh", formatLakh(125) → "₹1.25 Cr" */
export function formatLakh(lakhs: number | null | undefined): string {
  if (lakhs == null || Number.isNaN(lakhs)) return "—";
  return formatINR(lakhs * LAKH);
}

export function lakhToRupees(lakhs: number): number {
  return lakhs * LAKH;
}

/** A price range using compact notation. formatINRRange(3600000, 5800000) → "₹36 Lakh – ₹58 Lakh" */
export function formatINRRange(min: number, max: number): string {
  if (min === max) return formatINR(min);
  return `${formatINR(min)} – ${formatINR(max)}`;
}

/** Same, but for values already in LAKH (the common DB shape). */
export function formatLakhRange(minLakh: number, maxLakh: number): string {
  return formatINRRange(minLakh * LAKH, maxLakh * LAKH);
}

/** Full Indian-grouped rupees. formatINRFull(12500000) → "₹1,25,00,000" */
export function formatINRFull(rupees: number | null | undefined): string {
  if (rupees == null || Number.isNaN(rupees)) return "—";
  return `₹${groupIndian(rupees)}`;
}

// ─────────────────────────────────────────────────────────────
// Area & units
// ─────────────────────────────────────────────────────────────

export type AreaUnit = "sqyd" | "sqft" | "acre" | "guntha" | "cent" | "ankanam";

interface UnitMeta {
  key: AreaUnit;
  label: string;   // display label, e.g. "sq.yd"
  full: string;    // long name for tooltips
  sqft: number;    // 1 unit = N sq.ft (canonical conversion base)
  /** How many fraction digits to show for a quantity in this unit. */
  fraction: number;
}

/** Canonical conversion table — everything hangs off square feet. */
export const AREA_UNITS: Record<AreaUnit, UnitMeta> = {
  sqft:    { key: "sqft",    label: "sq.ft",   full: "Square Feet",  sqft: 1,      fraction: 0 },
  sqyd:    { key: "sqyd",    label: "sq.yd",   full: "Square Yards", sqft: 9,      fraction: 0 },
  guntha:  { key: "guntha",  label: "guntha",  full: "Guntha",       sqft: 1089,   fraction: 2 },
  cent:    { key: "cent",    label: "cent",    full: "Cent",         sqft: 435.6,  fraction: 2 },
  acre:    { key: "acre",    label: "acre",    full: "Acre",         sqft: 43560,  fraction: 3 },
  ankanam: { key: "ankanam", label: "ankanam", full: "Ankanam",      sqft: 72,     fraction: 1 },
};

export const AREA_UNIT_LIST: AreaUnit[] = ["sqyd", "sqft", "acre", "guntha", "cent", "ankanam"];

/** Convert an area quantity between units. convertArea(1, "acre", "sqyd") → 4840 */
export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (from === to) return value;
  const inSqft = value * AREA_UNITS[from].sqft;
  return inSqft / AREA_UNITS[to].sqft;
}

/** formatArea(200, "sqyd") → "200 sq.yd" ; formatArea(1.5, "acre") → "1.5 acre" */
export function formatArea(value: number | null | undefined, unit: AreaUnit): string {
  if (value == null || Number.isNaN(value)) return "—";
  const meta = AREA_UNITS[unit];
  const n = Number(value.toFixed(meta.fraction));
  return `${groupIndian(Math.trunc(n)) + (n % 1 ? "." + n.toString().split(".")[1] : "")} ${meta.label}`;
}

/** formatPerUnit(27000, "sqyd") → "₹27,000 / sq.yd" */
export function formatPerUnit(rupees: number | null | undefined, unit: AreaUnit): string {
  if (rupees == null || Number.isNaN(rupees)) return "—";
  return `${formatINRFull(rupees)} / ${AREA_UNITS[unit].label}`;
}

// ─────────────────────────────────────────────────────────────
// Percentages & trends
// ─────────────────────────────────────────────────────────────

export type TrendDir = "up" | "down" | "flat";

export function trendDirection(value: number): TrendDir {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

/**
 * Percentage with explicit direction arrow.
 *   formatPct(18.4)         → "▲ 18.4%"
 *   formatPct(-2.1)         → "▼ 2.1%"
 *   formatPct(340, {sign:true}) → "▲ +340%"
 */
export function formatPct(
  value: number | null | undefined,
  opts: { arrow?: boolean; sign?: boolean; fraction?: number } = {}
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const { arrow = true, sign = false, fraction = 1 } = opts;
  const dir = trendDirection(value);
  const arrowCh = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
  const magnitude = trimDecimal(Math.abs(value), fraction);
  const signCh = sign ? (dir === "up" ? "+" : dir === "down" ? "-" : "") : "";
  return `${arrow ? arrowCh + " " : ""}${signCh}${magnitude}%`;
}

// ─────────────────────────────────────────────────────────────
// EMI
// ─────────────────────────────────────────────────────────────

/** Standard reducing-balance EMI. Defaults from the spec: 8.7% p.a., 20 years. */
export function computeEMI(principalRupees: number, annualRatePct = 8.7, years = 20): number {
  if (principalRupees <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  const n = years * 12;
  if (r === 0) return principalRupees / n;
  const factor = Math.pow(1 + r, n);
  return (principalRupees * r * factor) / (factor - 1);
}

/** "EMI from ₹28,400/mo" — secondary price line. Pass rupees. */
export function formatEMI(principalRupees: number, annualRatePct = 8.7, years = 20): string {
  const emi = computeEMI(principalRupees, annualRatePct, years);
  // round to nearest ₹100 for a clean "from" figure
  const rounded = Math.round(emi / 100) * 100;
  return `EMI from ${formatINRFull(rounded)}/mo`;
}

// ─────────────────────────────────────────────────────────────
// Dates
// ─────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** formatDate(new Date("2026-08-15")) → "15 Aug 2026". Accepts Date | string | number. */
export function formatDate(input: Date | string | number | null | undefined): string {
  if (input == null) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mar 2026" — month + year only. */
export function formatMonthYear(input: Date | string | number | null | undefined): string {
  if (input == null) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────
// Phone
// ─────────────────────────────────────────────────────────────

/** Display an Indian mobile as "+91 98765 43210". Accepts messy input. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  const ten = digits.slice(-10);
  if (ten.length < 10) return raw;
  return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
}

// ─────────────────────────────────────────────────────────────
// Compact integers (registrations, counts) — e.g. "51,089"
// ─────────────────────────────────────────────────────────────

export function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return groupIndian(n);
}
