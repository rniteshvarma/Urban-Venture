/**
 * Deterministic readers for buyer replies. Fast, free and predictable — they
 * handle taps, numbers and the common phrasings ("45 lakhs", "1.2 cr",
 * "villa plot", "near Kokapet"). Claude only steps in when these come up empty.
 */
import type { BuyPurpose, ListingPropertyType } from "@prisma/client";
import type { CorridorOption, Slots, Step, Timeline } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();

export function isSkip(text: string): boolean {
  return /^(skip|no|nope|nothing|none|na|n\/a|thats all|that's all|no thanks|nothing else|not now)[.!]*$/i.test(text.trim());
}

export function isHandoff(text: string): boolean {
  return /\b(agent|human|real person|a person|talk to (someone|a person|an advisor|advisor|you)|call me|speak to|advisor)\b/i.test(text);
}

export function isRestart(text: string): boolean {
  return /^(restart|start over|start again|reset|new search)[.!]*$/i.test(text.trim());
}

export function isGreetingOnly(text: string): boolean {
  return /^(hi+|hello+|hey+|hii+|namaste|good (morning|afternoon|evening)|saw your ad|interested|info|details)[\s.!?]*$/i.test(text.trim());
}

// ── Purpose ──────────────────────────────────────────────────────────────
export function parsePurpose(text: string): BuyPurpose | null {
  const t = norm(text);
  if (/\bboth\b/.test(t)) return "BOTH";
  const invest = /\b(invest|investment|returns?|appreciation|resale|roi|rental|rent out|income|flip)\b/.test(t);
  const own = /\b(own use|own|self use|self|live|living|stay|staying|family|personal|my home|our home|to use|end use|move in)\b/.test(t);
  if (invest && own) return "BOTH";
  if (invest) return "INVESTMENT";
  if (own) return "OWN_USE";
  return null;
}

// ── Property type ────────────────────────────────────────────────────────
const TYPE_RULES: Array<[RegExp, ListingPropertyType]> = [
  [/\bvilla\s*plots?\b/, "VILLA_PLOT"],
  [/\bcommercial\s*(plots?|land)\b/, "COMMERCIAL_PLOT"],
  [/\b(commercial\s*space|shops?|office( space)?|showroom|retail)\b/, "COMMERCIAL_SPACE"],
  [/\b(industrial|warehouse|godown|factory)\b/, "INDUSTRIAL_LAND"],
  [/\b(farm\s*(land|house)?|agri(cultural)?\s*(land)?|weekend home)\b/, "FARM_LAND"],
  [/\b(apartments?|flats?|[1-5]\s*bhk|condo)\b/, "APARTMENT"],
  [/\b(independent\s*house|individual house|duplex|row house|house)\b/, "INDEPENDENT_HOUSE"],
  [/\bvillas?\b/, "VILLA"],
  [/\b(open\s*plots?|plots?|land|site)\b/, "OPEN_PLOT"],
];

export function parseTypes(text: string): { types: ListingPropertyType[]; notSure: boolean } | null {
  const t = norm(text);
  if (/\b(not sure|dont know|don't know|any|anything|open to all|suggest|no idea)\b/.test(t)) return { types: [], notSure: true };
  const found = new Set<ListingPropertyType>();
  let rest = t;
  for (const [re, type] of TYPE_RULES) {
    if (re.test(rest)) {
      found.add(type);
      rest = rest.replace(re, " "); // "villa plot" shouldn't also count as "villa" and "plot"
    }
  }
  return found.size ? { types: [...found], notSure: false } : null;
}

// ── Area ─────────────────────────────────────────────────────────────────
const GENERIC = new Set(["corridor", "growth", "commercial", "residential", "industrial", "warehousing", "premium", "villa", "villas", "plots", "future", "north", "south", "east", "west", "outer", "road", "extension", "influence", "valley", "heights"]);

/**
 * Words people use for a corridor: its short name and sub-areas, plus the
 * distinctive words of its full name and slug ("airport", "shamshabad",
 * "pharma city", "future city").
 */
/**
 * Words people use for a corridor, strongest first. Tier 1 is place names
 * (short name, sub-areas, slug parts like "shamshabad"); tier 2 is other
 * distinctive words of the full name ("airport", "aerospace", "pharma city").
 */
export function corridorAliasTiers(c: CorridorOption): [string[], string[]] {
  const clean = (xs: string[]) => Array.from(new Set(xs.map((x) => x.toLowerCase()).filter((x) => x.length >= 3)));
  const slugParts = c.slug.split("-").filter((w) => w.length >= 5 && !GENERIC.has(w));
  const tier1 = clean([c.shortName, ...(c.subAreas ?? []), ...(c.aliases ?? []), ...slugParts]);
  const nameWords = c.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !GENERIC.has(w));
  const cityPhrases = Array.from(c.name.toLowerCase().matchAll(/([a-z]+)\s+city/g), (m) => `${m[1]} city`);
  return [tier1, clean([...nameWords, ...cityPhrases]).filter((w) => !tier1.includes(w))];
}

export function corridorAliases(c: CorridorOption): string[] {
  const [a, b] = corridorAliasTiers(c);
  return [...a, ...b];
}

export function parseAreas(text: string, corridors: CorridorOption[]): { slugs: string[]; suggest: boolean } | null {
  const t = norm(text);
  if (/\b(anywhere|any area|suggest|you suggest|not sure|no preference|open|best area)\b/.test(t)) return { slugs: [], suggest: true };
  const hits: Array<{ slug: string; tier: number; pos: number }> = [];
  for (const c of corridors) {
    const tiers = corridorAliasTiers(c);
    for (let tier = 0; tier < tiers.length; tier++) {
      const positions = tiers[tier]
        .map((n) => t.search(new RegExp(`\\b${norm(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)))
        .filter((p) => p >= 0);
      if (positions.length) {
        hits.push({ slug: c.slug, tier, pos: Math.min(...positions) });
        break;
      }
    }
  }
  if (!hits.length) return null;
  // Place names beat descriptive words; earlier mentions beat later ones.
  hits.sort((a, b) => a.tier - b.tier || a.pos - b.pos);
  return { slugs: hits.map((h) => h.slug), suggest: false };
}

// ── Budget (lakhs) ───────────────────────────────────────────────────────
function toLakh(n: number, unit: string | undefined): number {
  const u = (unit ?? "").toLowerCase();
  if (/^(cr|crore|crores|c)$/.test(u)) return n * 100;
  if (/^(l|lac|lacs|lakh|lakhs|lk|lks)$/.test(u)) return n;
  if (/^(k|thousand)$/.test(u)) return n / 100;
  if (n >= 100000) return n / 100000; // plain rupees
  if (n < 10) return n * 100; // "1.5" on its own almost always means crore
  return n; // 10–99999 without a unit: lakhs
}

export function parseBudget(text: string): { min: number | null; max: number | null } | null {
  const t = norm(text).replace(/₹|rs\.?|inr/g, " ").replace(/,/g, "");
  if (/\b(not sure|not decided|flexible|no budget|depends)\b/.test(t)) return null;
  const num = "(\\d+(?:\\.\\d+)?)\\s*(cr|crores?|c|l|lacs?|lakhs?|lks?|k|thousand)?\\b";
  const range = t.match(new RegExp(`${num}\\s*(?:-|to|–|and)\\s*${num}`));
  if (range) {
    const hiUnit = range[4] ?? range[2];
    const lo = toLakh(Number(range[1]), range[2] ?? hiUnit);
    const hi = toLakh(Number(range[3]), hiUnit);
    return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
  }
  const one = t.match(new RegExp(num));
  if (!one) return null;
  const v = toLakh(Number(one[1]), one[2]);
  if (!Number.isFinite(v) || v <= 0 || v > 100000) return null;
  if (/\b(under|below|within|upto|up to|max|maximum|less than|around|about|approx|~)\b/.test(t)) {
    return /\b(around|about|approx|~)\b/.test(t) ? { min: Math.round(v * 0.8), max: Math.round(v * 1.15) } : { min: null, max: v };
  }
  if (/\b(above|over|more than|min|minimum|starting)\b/.test(t)) return { min: v, max: Math.round(v * 1.5) };
  return { min: Math.round(v * 0.8), max: v };
}

// ── Horizon / timeline ───────────────────────────────────────────────────
export function parseHorizon(text: string): number | null {
  const t = norm(text);
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+)?\s*(yrs?|years?|y)\b/);
  if (m) return Math.round(m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1]));
  if (/\b(short|quick|soon|1 year)\b/.test(t)) return 2;
  if (/\b(medium|mid)\b/.test(t)) return 4;
  if (/\b(long|longer|retire|decade|kids|children)\b/.test(t)) return 8;
  return null;
}

export function parseTimeline(text: string): Timeline | null {
  const t = norm(text);
  if (/\b(ready|immediate|immediately|now|asap|right away|urgent)\b/.test(t)) return "READY";
  if (/\b(this year|within a year|within 1|6 months|few months|next year|1 year)\b/.test(t)) return "WITHIN_1Y";
  if (/\b(2|3|two|three|later|no rush|flexible|under construction)\b/.test(t)) return "LATER";
  return null;
}

export function parseName(text: string): string | null {
  const t = text.trim().replace(/^(i am|im|i'm|this is|my name is|name is|call me)\s+/i, "");
  if (!t || t.length > 40 || /\d/.test(t)) return null;
  const words = t.split(/\s+/).slice(0, 3);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/** Apply a tapped option id ("t:VILLA", "a:kokapet-neopolis", "b:30-60"…) to the slots. */
export function applyOption(optionId: string, slots: Slots): Step | null {
  const [kind, value] = optionId.split(":");
  switch (kind) {
    case "p":
      slots.purpose = value as BuyPurpose;
      return "PURPOSE";
    case "t":
      slots.types = value === "NOT_SURE" ? [] : [value as ListingPropertyType];
      return "TYPE";
    case "a":
      slots.areas = value === "ANY" ? [] : [value];
      return "AREA";
    case "b": {
      if (value === "NA") {
        slots.budgetMinLakh = null;
        slots.budgetMaxLakh = null;
        return "BUDGET";
      }
      const [lo, hi] = value.split("-");
      slots.budgetMinLakh = lo ? Number(lo) : null;
      slots.budgetMaxLakh = hi ? Number(hi) : Number(lo) * 2;
      return "BUDGET";
    }
    case "h":
      slots.horizonYears = Number(value);
      return "HORIZON";
    case "tl":
      slots.timeline = value as Timeline;
      return "TIMELINE";
    case "x":
      slots.requirements = null;
      return "EXTRAS";
    default:
      return null;
  }
}

/** Run every parser over a message — for rich first messages ("villa plot in Kokapet under 80L"). */
export function parseEverything(text: string, corridors: CorridorOption[]): { slots: Partial<Slots>; steps: Step[] } {
  const slots: Partial<Slots> = {};
  const steps: Step[] = [];
  const purpose = parsePurpose(text);
  if (purpose) {
    slots.purpose = purpose;
    steps.push("PURPOSE");
  }
  const types = parseTypes(text);
  if (types && !types.notSure) {
    slots.types = types.types;
    steps.push("TYPE");
  }
  const areas = parseAreas(text, corridors);
  if (areas && !areas.suggest) {
    slots.areas = areas.slugs;
    steps.push("AREA");
  }
  // Only read a budget when money is clearly being talked about.
  if (/(₹|rs\.?|inr|\blakh|\blac|\bcr\b|crore|\bbudget|\d+\s*l\b)/i.test(text)) {
    const b = parseBudget(text);
    if (b) {
      slots.budgetMinLakh = b.min;
      slots.budgetMaxLakh = b.max;
      steps.push("BUDGET");
    }
  }
  const h = /\b(yrs?|years?)\b/i.test(text) ? parseHorizon(text) : null;
  if (h) {
    slots.horizonYears = h;
    steps.push("HORIZON");
  }
  return { slots, steps };
}
