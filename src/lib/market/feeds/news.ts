/**
 * City market figures from research-firm news (Knight Frank, ANAROCK, …).
 *
 * Reads the headline and the provider's short description of articles our
 * news crawler already collected, and pulls out Hyderabad figures with
 * simple patterns: registrations, registered value, average ₹/sq.ft, price
 * growth, homes sold. These are CANDIDATES — stored as PENDING and only used
 * once an admin has checked them against the article, because a pattern can
 * pick up the wrong city or period.
 *
 * Pure: unit-tested in feeds.test.ts.
 */

export type CityMetric =
  | "city_registrations"
  | "city_registrations_value_cr"
  | "city_avg_price_sqft"
  | "city_price_growth_yoy"
  | "city_sales_units"
  | "city_launch_units";

export const CITY_METRIC_LABEL: Record<CityMetric, { label: string; unit: string }> = {
  city_registrations: { label: "Homes registered", unit: "homes registered" },
  city_registrations_value_cr: { label: "Registered value", unit: "₹ Cr registered" },
  city_avg_price_sqft: { label: "Average apartment price", unit: "₹/sq.ft" },
  city_price_growth_yoy: { label: "Price growth, year on year", unit: "% a year" },
  city_sales_units: { label: "Homes sold", unit: "homes sold" },
  city_launch_units: { label: "Homes launched", unit: "homes launched" },
};

export interface NewsArticleInput {
  headline: string;
  blurb?: string | null;
  url: string;
  publishedAt: Date;
  sourceName: string;
}

export interface FigureCandidate {
  metric: CityMetric;
  value: number;
  unit: string;
  period: string;
  firm: string;
  snippet: string;
}

const FIRMS = /\b(Knight Frank|ANAROCK|PropEquity|JLL|CBRE|Square Yards|PropTiger|Cushman (?:&|and) Wakefield|Colliers)\b/i;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_RE = new RegExp(`\\b(${MONTHS.map((m) => m.slice(0, 3)).join("|")})[a-z]*\\.?(?:\\s+(20\\d\\d))?\\b`, "i");
const num = (s: string) => Number(s.replace(/,/g, ""));

/** "Q3 2026", "H1 2026", "July 2026", "FY2025-26" — else "as reported, Mon YYYY". */
export function detectPeriod(text: string, publishedAt: Date): string {
  const pubYear = publishedAt.getUTCFullYear();
  let m = text.match(/\b(Q[1-4])\s*(?:of\s*)?(?:CY\s*)?(20\d\d)?\b/i);
  if (m) return `${m[1].toUpperCase()} ${m[2] ?? pubYear}`;
  m = text.match(/\b(H[12])\s*(?:CY\s*)?(20\d\d)?\b/i);
  if (m) return `${m[1].toUpperCase()} ${m[2] ?? pubYear}`;
  m = text.match(/\bFY\s?'?(20)?(\d\d)(?:\s*[-–]\s*(\d\d))?\b/i);
  if (m) return m[3] ? `FY20${m[2]}-${m[3]}` : `FY20${m[2]}`;
  m = text.match(MONTH_RE);
  if (m) {
    const mi = MONTHS.findIndex((x) => x.slice(0, 3).toLowerCase() === m![1].slice(0, 3).toLowerCase());
    // A month later than publication without a year belongs to the year before.
    const year = m[2] ? Number(m[2]) : mi > publishedAt.getUTCMonth() ? pubYear - 1 : pubYear;
    return `${MONTHS[mi]} ${year}`;
  }
  return `as reported, ${MONTHS[publishedAt.getUTCMonth()].slice(0, 3)} ${pubYear}`;
}

function sentenceAround(text: string, index: number) {
  const start = Math.max(0, text.lastIndexOf(". ", index) + 1);
  const end = text.indexOf(". ", index);
  return text.slice(start, end < 0 ? undefined : end + 1).trim().slice(0, 220);
}

export function extractCandidates(a: NewsArticleInput): FigureCandidate[] {
  const text = `${a.headline}. ${a.blurb ?? ""}`.replace(/\s+/g, " ").trim();
  if (!/\bHyderabad\b/i.test(text)) return [];
  const firm = text.match(FIRMS)?.[1];
  if (!firm) return [];
  // A national roundup that merely lists Hyderabad among cities is too ambiguous.
  const otherCities = (text.match(/\b(Mumbai|MMR|Pune|Bengaluru|Bangalore|Chennai|Kolkata|NCR|Delhi|Ahmedabad|Noida|Gurugram)\b/gi) ?? []).length;
  if (otherCities >= 2) return [];

  const period = detectPeriod(text, a.publishedAt);
  const out: FigureCandidate[] = [];
  const add = (metric: CityMetric, value: number, index: number) => {
    if (!Number.isFinite(value) || value <= 0 || out.some((c) => c.metric === metric)) return;
    out.push({ metric, value, unit: CITY_METRIC_LABEL[metric].unit, period, firm, snippet: sentenceAround(text, index) });
  };
  const registration = /regist/i.test(text);

  for (const m of text.matchAll(/([\d,]{3,})\s+(?:residential\s+)?(?:properties|property units|homes|housing units|units|property registrations|registrations)\b/gi)) {
    const n = num(m[1]);
    if (n < 100) continue;
    const near = text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 40);
    if (registration && /regist/i.test(near)) add("city_registrations", n, m.index!);
    else if (/\bsold|sales\b/i.test(near)) add("city_sales_units", n, m.index!);
    else if (/launch/i.test(near)) add("city_launch_units", n, m.index!);
  }
  for (const m of text.matchAll(/(?:Rs\.?|₹|INR)\s?([\d,]+(?:\.\d+)?)\s*(?:crore|cr)\b/gi)) {
    if (registration) add("city_registrations_value_cr", num(m[1]), m.index!);
  }
  for (const m of text.matchAll(/(?:Rs\.?|₹|INR)\s?([\d,]{4,7})\s*(?:per|\/|a)\s*sq(?:uare)?\.?\s*f(?:ee)?t/gi)) {
    const n = num(m[1]);
    if (n >= 2000 && n <= 50000) add("city_avg_price_sqft", n, m.index!);
  }
  for (const m of text.matchAll(/prices?\b[^.;]{0,40}?\b(?:up|rise|rose|rising|increase[ds]?|grew|jump(?:ed)?|appreciat\w+)\s*(?:by\s*)?(\d{1,2}(?:\.\d)?)\s*(?:%|per ?cent)/gi)) {
    add("city_price_growth_yoy", Number(m[1]), m.index!);
  }
  return out;
}
