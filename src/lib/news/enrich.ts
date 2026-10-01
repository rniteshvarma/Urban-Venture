/**
 * Live enrichment (News module spec, Part 4 stage 4).
 *
 * Rules-first so the feed is fully functional without an API key; Claude, when
 * configured, upgrades category/sentiment/impact and writes the commentary.
 *
 * LEGAL GUARANTEES enforced here, in code:
 *  - commentary is OUR words: `copiesSource()` rejects any analysis that reuses
 *    a run of 6+ consecutive words from the headline or feed description, and
 *    we fall back to the rules template instead
 *  - commentary never restates the story; it says what it means for a buyer
 *  - nothing from the article body is ever read (we only have headline + feed blurb)
 */
import Anthropic from '@anthropic-ai/sdk';
import type { NewsCategory, NewsSentiment } from '@prisma/client';
import { claudeEnabled, EXTRACT_MODEL } from '../infra-intel/extract';
import { extractCrore, extractGoRef } from '../infra-intel/text';
import { findPlaces, haversineKm } from '../infra-intel/geo';
import { matchProject, type MatchableProject } from '../infra-intel/match';
import { visualSeed } from './dedupe';

export interface EnrichContext {
  citySlug: string;
  cityName: string;
  corridors: { slug: string; shortName: string; name: string; centroidLat: number | null; centroidLng: number | null }[];
  projects: MatchableProject[];
}

export interface EnrichInput {
  key: string;
  headline: string;
  blurb?: string | null;
  sourceName: string;
}

export interface LiveEnrichment {
  relevant: boolean;
  category: NewsCategory;
  sentiment: NewsSentiment;
  impactScore: number;
  corridorSlugs: string[];
  infraProjectIds: string[];
  authorities: string[];
  goReferences: string[];
  analysis: string | null;
  analysisBy: 'claude' | 'rules' | null;
}

// ── Category ─────────────────────────────────────────────────────────────────

const CATEGORY_TERMS: [NewsCategory, RegExp, number][] = [
  ['POLICY_REGULATION', /\b(rera|stamp duty|registration (charges|fee|fees)|guideline value|market value (of|for) (land|propert\w*|plots?)|land market value|circle rate|property tax|building permission|bpass|b-pass|lrs|layout regulari[sz]ation|master plan|zoning|g\.?\s?o\.?\s*(ms|rt)|government order|notification|amend\w*|rules? (for|on) (buyers|builders|developers|layouts?|plots?|registration)|housing policy|land policy|bhu bharati|dharani|fsi|far\b|setback|tdr|land conversion|nala|mutation|ordinance|guidelines|land acquisition|compensation|land pooling|lrs|prohibited (lands?|list)|22-?a|land records?|passbooks?|pattadar|patta|encumbrance)\b/i, 3],
  ['INFRASTRUCTURE', /\b(metro|flyover|highway|ring road|orr|rrr|airport|expressway|railway|mmts|road widening|underpass|elevated corridor|bridge|nhai|radial road|link road|infrastructure)\b/i, 3],
  ['LEGAL_DISPUTES', /\b(court|high court|supreme court|petition|encroach\w*|demoli\w*|hydraa|illegal|dispute|fraud|cheat\w*|seiz\w*|attach\w*|tribunal|ncdrc|consumer forum|arrest\w*|land disputes?|nhrc|litigation|title dispute|land grab\w*)\b/i, 3],
  ['MARKET_PRICES', /\b(prices?|sales|sold|inventory|unsold|demand|appreciation|rental|rents?|per sq ?ft|anarock|knight frank|propequity|jll|cbre|colliers|housing sales|absorption)\b/i, 2],
  ['PROJECT_LAUNCH', /\b(launch\w*|new project|township|gated community|joint development|land parcel|acquires? land|lakh sq ?ft|towers?|residential project|villa project|plotted development)\b/i, 2],
  ['INDUSTRIAL_JOBS', /\b(industrial|factory|plant|manufacturing|jobs|data cent(re|er)|campus|office space|leasing|it park|sez|gcc|capability centre|investment of)\b/i, 2],
  ['CIVIC_UTILITIES', /\b(water supply|drinking water|drainage|sewage|power supply|electricity|garbage|flood\w*|lake|stormwater|potholes?|ghmc|hmwssb)\b/i, 2],
  ['MACRO_FINANCE', /\b(repo rate|rbi|home loans?|interest rate|emi|inflation|reit|budget|gst|economy|ipo|nbfc|housing finance)\b/i, 2],
];

export function classifyCategory(text: string): NewsCategory {
  let best: NewsCategory = 'MARKET_PRICES';
  let bestScore = 0;
  for (const [cat, re, w] of CATEGORY_TERMS) {
    const hits = (text.match(new RegExp(re.source, 'gi')) ?? []).length;
    const score = hits * w;
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

// ── Sentiment ────────────────────────────────────────────────────────────────

const POSITIVE = /\b(approv\w*|sanction\w*|boost\w*|growth|grows|rises?|rising|surge\w*|record|jumps?|inaugurat\w*|complet\w*|opens?|eases?|relief|cuts? (repo|rates?)|rate cut|faster|green signal|nod|clears?|upgrade\w*|expands?|expansion|investment)\b/i;
const NEGATIVE = /\b(delay\w*|stall\w*|scrapp\w*|falls?|fell|declin\w*|drops?|demoli\w*|illegal|fraud|hikes?|protest\w*|halt\w*|cancel\w*|disput\w*|flood\w*|slump\w*|probe|violation|penalt\w*|crackdown|stuck|shortage|losses?)\b/i;

export function classifySentiment(text: string): NewsSentiment {
  const p = POSITIVE.test(text);
  const n = NEGATIVE.test(text);
  if (p && n) return 'MIXED';
  if (p) return 'POSITIVE';
  if (n) return 'NEGATIVE';
  return 'NEUTRAL';
}

// ── Entities ─────────────────────────────────────────────────────────────────

const AUTHORITIES: [string, RegExp][] = [
  ['HMDA', /\bhmda\b/i],
  ['GHMC', /\bghmc\b/i],
  ['TG RERA', /\b(tg|telangana|ts)[\s-]?rera\b/i],
  ['RERA', /\brera\b/i],
  ['HYDRAA', /\bhydraa?\b/i],
  ['TGIIC', /\b(tgiic|tsiic)\b/i],
  ['HMRL', /\b(hmrl|hyderabad metro rail)\b/i],
  ['NHAI', /\bnhai\b/i],
  ['DTCP', /\bdtcp\b/i],
  ['FCDA', /\bfcda\b/i],
  ['HMWSSB', /\bhmwssb\b/i],
  ['RBI', /\b(rbi|reserve bank)\b/i],
  ['MoHUA', /\bmohua\b/i],
  ['Revenue Dept', /\b(revenue department|registration department|igrs)\b/i],
];

export function findAuthorities(text: string): string[] {
  const hits = AUTHORITIES.filter(([, re]) => re.test(text)).map(([n]) => n);
  return hits.includes('TG RERA') ? hits.filter((h) => h !== 'RERA') : hits;
}

/** Corridors named in the text, or whose centre lies within 7 km of a place the text names. */
export function linkCorridors(text: string, corridors: EnrichContext['corridors']): string[] {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const c of corridors) {
    const names = [c.shortName, ...c.slug.split('-')].filter((n) => n.length >= 5);
    if (names.some((n) => new RegExp(`\\b${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower))) out.add(c.slug);
  }
  for (const p of findPlaces(text)) {
    if (p.generic) continue;
    for (const c of corridors) {
      if (c.centroidLat !== null && c.centroidLng !== null && haversineKm(p.lat, p.lng, c.centroidLat, c.centroidLng) <= 7) out.add(c.slug);
    }
  }
  return [...out].slice(0, 4);
}

// ── Impact ───────────────────────────────────────────────────────────────────

const BASE_IMPACT: Record<NewsCategory, number> = {
  POLICY_REGULATION: 6,
  INFRASTRUCTURE: 6,
  LEGAL_DISPUTES: 5,
  MARKET_PRICES: 5,
  INDUSTRIAL_JOBS: 5,
  MACRO_FINANCE: 5,
  PROJECT_LAUNCH: 4,
  CIVIC_UTILITIES: 4,
};

export function impactScore(x: { category: NewsCategory; text: string; corridors: number; authorities: number; goRef: boolean; projects: number }): number {
  let v = BASE_IMPACT[x.category];
  if (x.corridors > 0) v += 1;
  if (x.projects > 0) v += 1;
  if (x.authorities > 0) v += 1;
  if (x.goRef) v += 1;
  const cr = extractCrore(x.text);
  if (cr !== null && cr >= 1000) v += 1;
  if (/\b(demoli\w*|stamp duty|guideline value|market value|repo rate|master plan)\b/i.test(x.text)) v += 1;
  return Math.max(1, Math.min(10, v));
}

// ── Originality guard ────────────────────────────────────────────────────────

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9₹%\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** True if `analysis` reuses 6+ consecutive words from `source` (headline + blurb). */
export function copiesSource(analysis: string, source: string, run = 6): boolean {
  const a = words(analysis);
  const src = ` ${words(source).join(' ')} `;
  for (let i = 0; i + run <= a.length; i++) {
    if (src.includes(` ${a.slice(i, i + run).join(' ')} `)) return true;
  }
  return false;
}

// ── Rules commentary ─────────────────────────────────────────────────────────

function pick<T>(xs: T[], seed: string): T {
  return xs[parseInt(visualSeed(seed).slice(0, 6), 16) % xs.length];
}

function stageHint(text: string): string | null {
  if (/\b(tenders?|bids?)\b/i.test(text)) return 'It is at the tender stage, which usually comes just before construction starts.';
  if (/\b(land acquisition|3a notification|land pooling)\b/i.test(text)) return 'Land acquisition is under way, so the alignment is close to final.';
  if (/\b(inaugurat\w*|opened|opens)\b/i.test(text)) return 'It is now open, so the benefit is real today rather than on paper.';
  if (/\b(dpr|proposed|proposal|plans?|feasibility)\b/i.test(text)) return 'It is still at the proposal stage; timelines can move a lot from here.';
  if (/\b(delay\w*|stall\w*|on hold)\b/i.test(text)) return 'Treat any timeline built on it with caution until work resumes.';
  return null;
}

/**
 * Deterministic "why it matters" note in our own words. Factual framing only:
 * it names the area/authority and tells the reader what to check — it never
 * restates or summarises the article.
 */
export function rulesAnalysis(x: { key: string; category: NewsCategory; text: string; cityName: string; corridorNames: string[]; authorities: string[] }): string {
  const where = x.corridorNames.length ? x.corridorNames.slice(0, 2).join(' and ') : x.cityName === 'All India' ? 'your target market' : x.cityName;
  const who = x.authorities[0];
  const stage = stageHint(x.text);
  switch (x.category) {
    case 'INFRASTRUCTURE':
      return [
        `Infrastructure signal for ${where}. Connectivity projects are the biggest single driver of land values in our corridor scores.`,
        stage,
      ].filter(Boolean).join(' ');
    case 'POLICY_REGULATION':
      return pick(
        [
          `Rule change to note${who ? ` (${who})` : ''}: check how it affects registration cost, approvals or timelines before you commit to a purchase in ${where}.`,
          `Regulatory update${who ? ` from ${who}` : ''}. If you are mid-transaction in ${where}, confirm with your lawyer whether it applies to your deal.`,
        ],
        x.key,
      );
    case 'LEGAL_DISPUTES':
      return `Legal risk flag for ${where}. Before buying nearby, verify the title, approvals and any lake or government-land buffer on the exact survey number.`;
    case 'MARKET_PRICES':
      return `Price and demand data point for ${where}. Compare it with the corridor's registration trend before reading it as a buy or sell signal.`;
    case 'PROJECT_LAUNCH':
      return `New supply in ${where}. Fresh launches add choice but can slow resale appreciation for older stock nearby.`;
    case 'INDUSTRIAL_JOBS':
      return `Jobs and investment signal for ${where}. Employment hubs tend to lift rental demand first, then land prices within commuting distance.`;
    case 'CIVIC_UTILITIES':
      return `Civic services update for ${where}. Water, drainage and power reliability directly affect livability and rental yields.`;
    case 'MACRO_FINANCE':
      return `Financing backdrop: rates and credit conditions change what buyers can afford across every corridor, ${where} included.`;
  }
}

// ── Claude (optional upgrade) ────────────────────────────────────────────────

const CATS: NewsCategory[] = ['INFRASTRUCTURE', 'POLICY_REGULATION', 'MARKET_PRICES', 'PROJECT_LAUNCH', 'INDUSTRIAL_JOBS', 'LEGAL_DISPUTES', 'CIVIC_UTILITIES', 'MACRO_FINANCE'];
const SENTS: NewsSentiment[] = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'relevant', 'category', 'sentiment', 'impactScore', 'analysis'],
        properties: {
          key: { type: 'string' },
          relevant: { type: 'boolean' },
          category: { type: 'string', enum: CATS },
          sentiment: { type: 'string', enum: SENTS },
          impactScore: { type: 'integer' },
          analysis: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM = `You are the analyst voice of Property Tiger, a land and property investment research product for Hyderabad and India.
For each news headline decide if it matters to someone buying land or property (real estate, infrastructure, rules and regulations, legal risk, prices, financing, jobs hubs). Crime, sport, entertainment and general politics are not relevant.
Write "analysis": at most 2 short sentences in your own words about what it MEANS for a buyer or investor — never restate or paraphrase the headline, never quote it, never invent facts, numbers or dates that are not in the headline. If unsure, say what the reader should check.
impactScore 1-10 = how much it could change a buyer's decision in the named area.`;

interface AiItem {
  key: string;
  relevant: boolean;
  category: NewsCategory;
  sentiment: NewsSentiment;
  impactScore: number;
  analysis: string;
}

async function claudeEnrich(items: EnrichInput[], cityName: string): Promise<Map<string, AiItem>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const list = items.map((i) => `[${i.key}] ${i.headline}${i.blurb ? ` — ${i.blurb.slice(0, 240)}` : ''} (${i.sourceName})`).join('\n');
  const res = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 16000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Reader's city: ${cityName}\n\n${list}` }],
  });
  const out = new Map<string, AiItem>();
  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return out;
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  for (const it of (JSON.parse(text) as { items: AiItem[] }).items) {
    out.set(it.key, { ...it, impactScore: Math.max(1, Math.min(10, it.impactScore)) });
  }
  return out;
}

// ── Public ───────────────────────────────────────────────────────────────────

export async function enrichBatch(items: EnrichInput[], ctx: EnrichContext): Promise<Map<string, LiveEnrichment>> {
  const out = new Map<string, LiveEnrichment>();
  const ai = new Map<string, AiItem>();
  if (claudeEnabled() && items.length) {
    try {
      for (let i = 0; i < items.length; i += 20) {
        for (const [k, v] of await claudeEnrich(items.slice(i, i + 20), ctx.cityName)) ai.set(k, v);
      }
    } catch (e) {
      console.error('[news] Claude enrichment failed; using rules:', e instanceof Error ? e.message : e);
    }
  }
  const corridorName = new Map(ctx.corridors.map((c) => [c.slug, c.shortName]));
  for (const it of items) {
    const text = `${it.headline}. ${it.blurb ?? ''}`;
    const corridorSlugs = linkCorridors(text, ctx.corridors);
    const authorities = findAuthorities(text);
    const go = extractGoRef(text);
    const m = matchProject(ctx.projects, it.headline, text);
    const infraProjectIds = m.projectId && m.score >= 0.75 ? [m.projectId] : [];
    const rulesCategory = classifyCategory(text);
    const a = ai.get(it.key);
    const category = a?.category ?? rulesCategory;
    let analysis: string | null = a?.analysis?.trim() || null;
    let analysisBy: LiveEnrichment['analysisBy'] = analysis ? 'claude' : null;
    if (analysis && copiesSource(analysis, text)) analysis = null; // legal guard: never echo the publisher's words
    if (!analysis) {
      analysis = rulesAnalysis({ key: it.key, category, text, cityName: ctx.cityName, corridorNames: corridorSlugs.map((s) => corridorName.get(s) ?? s), authorities });
      analysisBy = 'rules';
    }
    out.set(it.key, {
      relevant: a ? a.relevant : true,
      category,
      sentiment: a?.sentiment ?? classifySentiment(text),
      impactScore: a?.impactScore ?? impactScore({ category, text, corridors: corridorSlugs.length, authorities: authorities.length, goRef: !!go, projects: infraProjectIds.length }),
      corridorSlugs,
      infraProjectIds,
      authorities,
      goReferences: go ? [go] : [],
      analysis,
      analysisBy,
    });
  }
  return out;
}
