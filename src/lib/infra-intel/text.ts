/**
 * Deterministic text analysis for infra headlines: relevance, event type,
 * proposed status, numbers (₹ crore, km, % complete, GO refs), category and a
 * best-effort project name. This is the extractor of record when no Claude key
 * is configured and the safety net when a Claude call fails or refuses.
 */

export type EventType =
  | 'NEW_PROJECT'
  | 'STATUS_CHANGE'
  | 'PROGRESS_UPDATE'
  | 'TENDER'
  | 'BUDGET'
  | 'LAND_ACQUISITION'
  | 'DELAY'
  | 'COMPLETION'
  | 'MILESTONE'
  | 'OTHER';

export type InfraStatusValue =
  | 'ANNOUNCED'
  | 'APPROVED'
  | 'LAND_ACQUISITION'
  | 'UNDER_CONSTRUCTION'
  | 'PARTIALLY_COMPLETE'
  | 'COMPLETE'
  | 'DELAYED'
  | 'CANCELLED';

export type InfraCategoryValue =
  | 'ROAD_HIGHWAY'
  | 'METRO_RAIL'
  | 'INDUSTRIAL_ZONE'
  | 'PHARMA_BIOTECH'
  | 'LOGISTICS_PARK'
  | 'AIRPORT_AVIATION'
  | 'GOVT_APPROVAL'
  | 'TOWNSHIP'
  | 'IT_TECH_PARK'
  | 'UTILITY';

/** Forward progression of a project. DELAYED/CANCELLED sit outside it. */
export const STATUS_RANK: Record<string, number> = {
  ANNOUNCED: 1,
  APPROVED: 2,
  LAND_ACQUISITION: 3,
  UNDER_CONSTRUCTION: 4,
  PARTIALLY_COMPLETE: 5,
  COMPLETE: 6,
};

// ── Relevance ────────────────────────────────────────────────────────────────

const INFRA_TERMS = [
  'road widening', 'road expansion', 'widening', 'widen', 'four-lane', 'six-lane', 'eight-lane', '4-lane', '6-lane',
  'flyover', 'elevated corridor', 'elevated expressway', 'underpass', 'rob', 'rub', 'rail over bridge', 'road under bridge',
  'skyway', 'steel bridge', 'link road', 'radial road', 'missing link', 'grid road', 'service road', 'interchange',
  'grade separator', 'bypass', 'ring road', 'orr', 'rrr', 'national highway', 'highway', 'expressway', 'greenfield road',
  'metro', 'mmts', 'railway line', 'railway station', 'rail line', 'terminal', 'airport', 'cargo hub', 'mro',
  'industrial park', 'industrial corridor', 'industrial cluster', 'sez', 'pharma city', 'future city', 'fourth city',
  'it park', 'tech park', 'data centre', 'data center', 'logistics park', 'dry port', 'warehousing', 'township',
  'master plan', 'hmda', 'hrdcl', 'srdp', 'tgiic', 'tsiic', 'nhai', 'morth', 'water supply', 'reservoir',
  'sewage treatment', 'stp', 'musi', 'riverfront', 'drinking water', 'substation', 'bridge', 'tunnel', 'bus terminal',
  'satellite town', 'land pooling', 'infrastructure', 'infra project', 'bharatmala', 'gati shakti',
];

/** Accidents / weather on infra — relevant only if the item also talks about works. */
const SOFT_NOISE = [
  'dies', 'died', 'dead', 'death', 'killed', 'collides', 'collision', 'accident', 'burnt', 'catches fire', 'flooding',
  'waterlogging', 'waterlogged', 'mishap',
];
/** Crime, courts-on-individuals, markets, entertainment — never an infra update. */
const HARD_NOISE = [
  'murder', 'arrested', 'rape', 'suicide', 'stabbed', 'robbery', 'cricket', 'ipl', 'box office', 'film', 'movie', 'actor',
  'actress', 'horoscope', 'obituary', 'stock market', 'sensex', 'cbi', 'acb', 'booked', 'bribe', 'disproportionate assets',
  'stray cattle', 'raises rs', 'raises ₹', 'order from', 'shares', 'ipo', 'quarterly results', 'allegation', 'irregularities',
  'rigging', 'scam', 'draws criticism', 'draws flak',
];

function hasTerm(text: string, term: string): boolean {
  // Short acronyms must be whole words; longer phrases may be substrings.
  if (term.length <= 4) return new RegExp(`\\b${term.replace(/[-]/g, '\\-')}\\b`, 'i').test(text);
  return text.toLowerCase().includes(term);
}

export function infraTermHits(text: string): string[] {
  return INFRA_TERMS.filter((t) => hasTerm(text, t));
}

export function isRelevant(text: string): boolean {
  const hits = infraTermHits(text);
  if (hits.length === 0) return false;
  if (HARD_NOISE.some((t) => hasTerm(text, t))) return false;
  if (SOFT_NOISE.some((t) => hasTerm(text, t))) {
    // A crash on a flyover is not an infra update — unless it also says works/project.
    return /\b(works?|project|construction|sanction|crore|tender)\b/i.test(text);
  }
  // "infrastructure" alone is too vague; require a concrete term or a money/status cue.
  if (hits.length === 1 && hits[0] === 'infrastructure') {
    return /\b(crore|tender|sanction|approved|foundation stone|inaugurat)\w*/i.test(text);
  }
  return true;
}

// ── Numbers ──────────────────────────────────────────────────────────────────

export function extractCrore(text: string): number | null {
  const re = /(?:rs\.?|₹|inr)\s?([\d,]+(?:\.\d+)?)\s*(lakh\s*crore|crores?|cr\b)/gi;
  let best: number | null = null;
  for (const m of text.matchAll(re)) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    const value = /lakh/i.test(m[2]) ? n * 100000 : n;
    if (best === null || value > best) best = value;
  }
  // "5,000 crore" without a currency marker
  if (best === null) {
    const bare = text.match(/([\d,]+(?:\.\d+)?)\s*(lakh\s*crore|crores?)\b/i);
    if (bare) {
      const n = parseFloat(bare[1].replace(/,/g, ''));
      if (Number.isFinite(n)) best = /lakh/i.test(bare[2]) ? n * 100000 : n;
    }
  }
  return best;
}

export function extractKm(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s?-?\s?(?:km|kms|kilometres?|kilometers?)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 && n < 2000 ? n : null;
}

export function extractCompletionPct(text: string): number | null {
  const m = text.match(
    /(\d{1,3}(?:\.\d+)?)\s?(?:%|per\s?cent|percent)\s*(?:of\s+(?:the\s+)?)?(?:works?|construction|project)?\s*(?:is\s+|are\s+|has\s+been\s+)?(?:complete|completed|done|finished|over|progress)/i,
  ) ?? text.match(/(?:complete|completed|finished|progress(?:\s+of)?)\s+(\d{1,3}(?:\.\d+)?)\s?(?:%|per\s?cent|percent)/i);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1]));
  return n >= 0 && n <= 100 ? n : null;
}

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

/** Target completion like "by June 2027" / "deadline of December 2026" → "Jun 2027". */
export function extractTargetDate(text: string): string | null {
  const m = text.match(new RegExp(`\\b(?:by|deadline(?: of)?|targets?|opening in|complete(?:d)? in|ready by)\\s+(?:the\\s+)?(?:end of\\s+)?(${MONTHS})?\\s*,?\\s*(20[2-4]\\d)\\b`, 'i'));
  if (!m) return null;
  const mon = m[1] ? m[1].slice(0, 3) : null;
  return mon ? `${mon[0].toUpperCase()}${mon.slice(1).toLowerCase()} ${m[2]}` : m[2];
}

export function extractGoRef(text: string): string | null {
  const m = text.match(/G\.?\s?O\.?\s*(?:\(?\s*(?:Ms|Rt|P)\.?\s*\)?\s*)?No\.?\s*\d+[^\s,;]*/i);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
}

// ── Classification ───────────────────────────────────────────────────────────

interface Rule {
  re: RegExp;
  event: EventType;
  status: InfraStatusValue | null;
}

// Order matters: the first rule that matches wins.
const EVENT_RULES: Rule[] = [
  { re: /\b(scrapped|cancel+ed|shelved|dropped the (plan|project)|abandon(ed)?)\b/i, event: 'STATUS_CHANGE', status: 'CANCELLED' },
  { re: /\b(delay(ed|s)?|stalled|halted|behind schedule|deadline (missed|extended)|new deadline|on hold|crawl(ing)? pace|slow pace|missed deadline|revised deadline|pushed back)\b/i, event: 'DELAY', status: 'DELAYED' },
  { re: /\b(inaugurat\w*|opened to (the )?(traffic|public|commuters)|thrown open|dedicated to the nation|commissioned|now operational|becomes operational|to open today|opens today|opened today|opens on)\b/i, event: 'COMPLETION', status: 'COMPLETE' },
  { re: /\b(land acquisition|acquir\w+ (of )?land|3a notification|3d notification|compensation to (farmers|land ?losers)|land pooling|r\s?&\s?r package|land ?losers)\b/i, event: 'LAND_ACQUISITION', status: 'LAND_ACQUISITION' },
  { re: /\b(tenders?|bids?|bidders?|calls bids|invites bids|epc contract|contract awarded|awarded (the )?contract|l1 bidder|rfp|request for proposals?)\b/i, event: 'TENDER', status: 'APPROVED' },
  { re: /\b(foundation stone|bhoomi ?puja|ground ?breaking|works? (begin|began|begins|started|commence\w*)|construction (begins|began|started|underway|in progress)|under construction|works? (in progress|underway|progressing)|work on .{0,40} (begins|started)|lays? (the )?ground|works? gain\w* pace|to be completed by|to (open|be ready) by|nearing completion|completion by)\b/i, event: 'STATUS_CHANGE', status: 'UNDER_CONSTRUCTION' },
  { re: /\b(sanction(ed|s)?|allocat(ed|ion)|budget|released (funds|rs|₹)|administrative sanction|funds? released)\b/i, event: 'BUDGET', status: 'APPROVED' },
  { re: /\b(approv(ed|al|es)|g\.?\s?o\.?\s*(ms|rt)|government order|cabinet nod|gets? nod|green signal|clearance|cleared by|dpr approved|in-principle)\b/i, event: 'STATUS_CHANGE', status: 'APPROVED' },
  { re: /\b(proposed|proposal|plans? to|to (build|construct|develop|lay)|will (build|construct|develop|lay)|mooted|feasibility|dpr|survey|announc\w+|on the cards|blueprint)\b/i, event: 'NEW_PROJECT', status: 'ANNOUNCED' },
];

export function classifyEvent(text: string): { event: EventType; status: InfraStatusValue | null } {
  const pct = extractCompletionPct(text);
  for (const rule of EVENT_RULES) {
    if (rule.re.test(text)) {
      if (rule.status === 'COMPLETE' && /\b(first|phase[- ]?(1|i)\b|partial|part of|stretch|section)\b/i.test(text)) {
        return { event: 'COMPLETION', status: 'PARTIALLY_COMPLETE' };
      }
      if (pct !== null && (rule.status === 'UNDER_CONSTRUCTION' || rule.event === 'NEW_PROJECT')) {
        return { event: 'PROGRESS_UPDATE', status: pct >= 100 ? 'COMPLETE' : 'UNDER_CONSTRUCTION' };
      }
      return { event: rule.event, status: rule.status };
    }
  }
  if (pct !== null) return { event: 'PROGRESS_UPDATE', status: pct >= 100 ? 'COMPLETE' : 'UNDER_CONSTRUCTION' };
  return { event: 'OTHER', status: null };
}

const CATEGORY_RULES: [RegExp, InfraCategoryValue][] = [
  [/\b(metro|mmts|railway|rail line|train|vande bharat|station)\b/i, 'METRO_RAIL'],
  [/\b(airport|aviation|cargo|mro|aerospace|rgia)\b/i, 'AIRPORT_AVIATION'],
  [/\b(pharma|biotech|genome valley|life sciences)\b/i, 'PHARMA_BIOTECH'],
  [/\b(it park|tech park|it corridor|data cent(re|er)|hardware park|electronics)\b/i, 'IT_TECH_PARK'],
  [/\b(logistics|dry port|warehous\w+|freight)\b/i, 'LOGISTICS_PARK'],
  [/\b(industrial|sez|tgiic|tsiic|manufacturing cluster)\b/i, 'INDUSTRIAL_ZONE'],
  [/\b(township|satellite town|future city|fourth city|master plan|land pooling)\b/i, 'TOWNSHIP'],
  [/\b(water|reservoir|sewage|stp|drain|power|substation|musi|riverfront|pipeline)\b/i, 'UTILITY'],
  [/\b(road|flyover|highway|expressway|underpass|rob|rub|bridge|ring road|orr|rrr|corridor|lane|skyway|interchange|bypass|junction)\b/i, 'ROAD_HIGHWAY'],
];

export function classifyCategory(text: string): InfraCategoryValue | null {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(text)) return cat;
  return null;
}

// ── Project name ─────────────────────────────────────────────────────────────

const NAMED_PROJECTS: [RegExp, string][] = [
  [/\bregional ring road\b|\brrr\b/i, 'Regional Ring Road (RRR)'],
  [/\bouter ring road\b|\borr\b/i, 'Outer Ring Road (ORR)'],
  [/\bmusi (riverfront|rejuvenation)/i, 'Musi Riverfront Development Project'],
  [/\bpharma city\b/i, 'Pharma City'],
  [/\b(bharat )?future city\b|\bfourth city\b/i, 'Future City'],
  [/\bgenome valley\b/i, 'Genome Valley'],
];

const FACILITY_WORDS = [
  'flyover', 'elevated corridor', 'elevated expressway', 'underpass', 'ROB', 'RUB', 'road over bridge', 'road under bridge',
  'skyway', 'steel bridge', 'link road', 'radial road', 'road widening', 'road', 'bridge', 'interchange', 'metro rail',
  'metro corridor', 'metro line', 'metro', 'railway line', 'terminal', 'industrial park', 'IT park', 'tech park',
  'logistics park', 'township', 'expressway', 'highway', 'bypass',
];
/** Case-insensitive on the first letter of each word only, so the capitalised-lead heuristic still works. */
const FACILITY = `(${FACILITY_WORDS.map((w) =>
  w.split(' ').map((x) => (/^[A-Z]+$/.test(x) ? x : `[${x[0].toUpperCase()}${x[0]}]${x.slice(1)}`)).join(' '),
).join('|')})`;

/** Best-effort name: "Uppal–Narapally elevated corridor", "NH-65 widening", or a named mega-project. */
export function extractProjectName(title: string): string {
  const nh = title.match(/\bNH[- ]?(\d{1,3}[A-Z]?)\b/i);
  // "elevated corridor between Banjara Hills and Gachibowli" / "flyover from X to Y"
  const between = title.match(
    new RegExp(`${FACILITY}\\s+(?:between|from)\\s+((?:[A-Z][A-Za-z.'’]+\\s?){1,3})\\s*(?:and|to|-|–)\\s*((?:[A-Z][A-Za-z.'’]+\\s?){1,3})`),
  );
  if (between) return `${between[2].trim()}–${between[3].trim()} ${between[1].toLowerCase()}`;
  const facilityRe = new RegExp(
    `((?:[A-Z][A-Za-z.'’]*(?:\\s?[-–]\\s?|\\s(?:to|and)\\s|\\s)){1,5})${FACILITY}(?:[- ]\\d+)?\\b`,
  );
  const m = title.match(facilityRe);
  if (m) {
    const lead = m[1]
      .trim()
      .replace(/^(?:(?:The|New|A|Crore|Cr|Rs|Makes|Hyderabad['’]s|Hyderabad|Telangana|HMDA|GHMC|HRDCL|Govt|Government)\s+)+/i, '');
    if (lead.length >= 3) return `${lead} ${m[0].slice(m[1].length)}`.replace(/\s+/g, ' ').trim();
  }
  for (const [re, name] of NAMED_PROJECTS) if (re.test(title)) return name;
  if (nh) return `NH-${nh[1].toUpperCase()} ${/widen/i.test(title) ? 'widening' : 'project'}`;
  return title.replace(/\s+-\s+[^-]+$/, '').slice(0, 120).trim();
}

// ── Rules extractor ──────────────────────────────────────────────────────────

export interface ExtractedFact {
  projectName: string;
  eventType: EventType;
  proposedStatus: InfraStatusValue | null;
  category: InfraCategoryValue | null;
  completionPct: number | null;
  investmentCr: number | null;
  lengthKm: number | null;
  goRef: string | null;
  targetCompletion: string | null;
  places: string[];
  summary: string;
  confidence: number; // 0-100
  matchedProjectId?: string | null;
}

export function rulesExtract(title: string, summary = '', placeNames: string[] = []): ExtractedFact | null {
  const text = `${title}. ${summary}`;
  if (!isRelevant(text)) return null;
  const { event, status } = classifyEvent(text);
  const pct = extractCompletionPct(text);
  const cr = extractCrore(text);
  const km = extractKm(text);
  const go = extractGoRef(text);
  const category = classifyCategory(text);

  let confidence = 40;
  if (event !== 'OTHER') confidence += 12;
  if (placeNames.length > 0) confidence += 8;
  if (category) confidence += 5;
  if (pct !== null || cr !== null || km !== null) confidence += 5;
  if (go) confidence += 8;
  confidence = Math.min(75, confidence); // rules never claim high certainty

  return {
    projectName: extractProjectName(title),
    eventType: event,
    proposedStatus: status,
    category,
    completionPct: pct,
    investmentCr: cr,
    lengthKm: km,
    goRef: go,
    targetCompletion: extractTargetDate(text),
    places: placeNames,
    summary: title.slice(0, 240),
    confidence,
  };
}
