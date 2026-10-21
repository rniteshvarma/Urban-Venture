/** Small text helpers shared by the inventory source parsers. */

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** "89.42 L" → 89.42, "1.13 Cr" → 113, "₹ 2,50,000" → 2.5, "Price on Request" → null */
export function parsePriceLakh(s: string | undefined | null): number | null {
  if (!s) return null;
  const t = s.replace(/,/g, "").replace(/₹/g, "").trim();
  const m = t.match(/(\d+(?:\.\d+)?)\s*(cr|crore|crores|l|lac|lacs|lakh|lakhs|k)?\b/i);
  if (!m) return null;
  const v = Number(m[1]);
  const unit = (m[2] ?? "").toLowerCase();
  if (unit.startsWith("cr")) return Math.round(v * 100 * 100) / 100;
  if (unit.startsWith("l")) return Math.round(v * 100) / 100;
  if (unit === "k") return Math.round((v / 100) * 100) / 100;
  // A bare rupee amount
  return v >= 10_000 ? Math.round((v / 100_000) * 100) / 100 : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Dec, 2027" / "December 2027" / "12/2027" / "2027-12-31" → "2027-12-01"; a bare year → December of it. */
export function parseMonthYear(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.toLowerCase();
  const iso = t.match(/(20\d{2})-(\d{2})-\d{2}/);
  if (iso) return `${iso[1]}-${iso[2]}-01`;
  const my = t.match(/\b([a-z]{3})[a-z]*[\s,.'-]*(20\d{2})\b/);
  if (my && MONTHS.includes(my[1])) return `${my[2]}-${String(MONTHS.indexOf(my[1]) + 1).padStart(2, "0")}-01`;
  const num = t.match(/\b(\d{1,2})\s*[/-]\s*(20\d{2})\b/);
  if (num && +num[1] >= 1 && +num[1] <= 12) return `${num[2]}-${num[1].padStart(2, "0")}-01`;
  const y = t.match(/\b(20\d{2})\b/);
  return y ? `${y[1]}-12-01` : null;
}

/** TG-RERA project numbers in a string: P + 11 digits (e.g. P02400001821). */
export function reraNumbersIn(s: string): string[] {
  return [...new Set([...s.toUpperCase().matchAll(/\bP\s?0\d{10}\b/g)].map((m) => m[0].replace(/\s/g, "")))];
}
