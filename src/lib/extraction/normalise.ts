/**
 * Indian real-estate value normalisation (Brochure Ingestion spec, Stage 7).
 * Pure, unit-tested — the most bug-prone part of extraction, so it is built and
 * tested before any pipeline wiring.
 *
 * Golden rule: NEVER discard the printed value. These helpers return normalised
 * numbers; callers must keep the original string alongside.
 */

export interface ParsedCurrency {
  raw: string;
  rupees?: number; // total price in ₹
  lakh?: number; // total price in Lakh
  crore?: number; // total price in Crore
  ratePerSqFt?: number; // a rate, not a total
  ratePerSqYd?: number;
  note?: string; // "onwards", "starting from", "+ GST", "all inclusive", ...
}

const NOTE_PATTERNS: RegExp[] = [
  /onwards?/i,
  /starting\s*(?:from)?/i,
  /all\s*inclusive/i,
  /\+\s*gst/i,
  /incl\.?\s*gst/i,
  /negotiable/i,
  /all\s*in/i,
];

/** Parse a printed Indian price string into normalised amounts. */
export function parseIndianCurrency(input: string): ParsedCurrency {
  const out: ParsedCurrency = { raw: input };
  const lower = input.toLowerCase().trim();

  for (const re of NOTE_PATTERNS) {
    const m = lower.match(re);
    if (m) {
      out.note = m[0].replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // Strip currency symbols and thousands/lakh grouping commas, then read the number.
  const cleaned = lower.replace(/[₹]/g, '').replace(/rs\.?/g, '').replace(/,/g, '');
  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return out;
  const value = parseFloat(numMatch[1]);

  const isRateSqFt = /(?:\/|per\s*)\s*sq\.?\s*(?:ft|feet)|psf|per\s*sft/.test(lower);
  const isRateSqYd = /(?:\/|per\s*)\s*sq\.?\s*(?:yd|yard)|psy|per\s*syd/.test(lower);
  const isCrore = /\bcrores?\b|\bcror\b|\bcr\b/.test(lower);
  // Lakh: word forms, or a bare 'l' immediately after the number (e.g. "45.5l").
  const isLakh = /\blakhs?\b|\blacs?\b|\d\s*l\b/.test(lower);

  if (isRateSqFt) {
    out.ratePerSqFt = value;
  } else if (isRateSqYd) {
    out.ratePerSqYd = value;
  } else if (isCrore) {
    out.crore = value;
    out.lakh = value * 100;
    out.rupees = Math.round(value * 1e7);
  } else if (isLakh) {
    out.lakh = value;
    out.rupees = Math.round(value * 1e5);
  } else {
    // Plain rupee amount (Indian-grouped or not).
    out.rupees = Math.round(value);
    out.lakh = value / 1e5;
  }
  return out;
}

// ── Area ─────────────────────────────────────────────────────────────────────

export type AreaUnit = 'SQFT' | 'SQYD' | 'SQM' | 'ACRE' | 'GUNTHA' | 'CENT' | 'ANKANAM';

/** Conversion factor to square feet. */
const SQFT_PER_UNIT: Record<AreaUnit, number> = {
  SQFT: 1,
  SQYD: 9,
  SQM: 10.7639,
  ACRE: 43560,
  GUNTHA: 1089, // 1 guntha = 1089 sq.ft
  CENT: 435.6, // 1 cent = 435.6 sq.ft
  ANKANAM: 72, // 1 ankanam = 72 sq.ft = 8 sq.yd
};

export interface ConvertedArea {
  sqFt: number;
  sqYd: number;
}

/** Round to at most `dp` decimals without trailing float noise. */
function round(n: number, dp = 2): number {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}

/** Convert an area in any supported Indian unit to sq.ft and sq.yd. */
export function convertArea(value: number, unit: AreaUnit): ConvertedArea {
  const sqFt = value * SQFT_PER_UNIT[unit];
  return { sqFt: round(sqFt, 1), sqYd: round(sqFt / 9, 1) };
}

/** Normalise a free-text unit token (e.g. "Sq. Yards", "guntas") to an AreaUnit. */
export function parseAreaUnit(token: string | null | undefined): AreaUnit | null {
  if (!token) return null;
  const t = token.toLowerCase().replace(/[^a-z]/g, '');
  if (/sqft|sft|squarefeet|squarefoot/.test(t)) return 'SQFT';
  if (/sqyd|syd|sqyard|squareyard|yard|guz|gaj/.test(t)) return 'SQYD';
  if (/sqm|squaremet/.test(t)) return 'SQM';
  if (/acre/.test(t)) return 'ACRE';
  if (/gunt/.test(t)) return 'GUNTHA';
  if (/cent/.test(t)) return 'CENT';
  if (/ankanam|ankana/.test(t)) return 'ANKANAM';
  return null;
}
