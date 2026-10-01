/**
 * Live multi-source provider — no API key, no scraping.
 *
 * Pulls ONLY syndication feeds that publishers offer for exactly this purpose
 * (RSS) plus Google News RSS searches, in parallel:
 *   - per-city topic searches: real estate · infrastructure · rules & regulations
 *     · the city's own query terms (HMDA, RRR, Kokapet …)
 *   - direct publisher feeds for the city (The Hindu / TOI Hyderabad)
 *   - national real-estate feeds (ET Realty, ET Property, HT Real Estate),
 *     kept for a city only when the item mentions that city
 *
 * Legal posture (spec Part 0): we read headline, link, publisher, time and the
 * feed's own short description. We never fetch article pages, never keep the
 * body, never touch images. The description is used only as AI/rules input and
 * is not displayed.
 *
 * Reachability audit 2026-09-22: all feeds below returned 200 with items.
 * Moneycontrol / Deccan Chronicle / NewsMeter 403 bots → covered via Google News.
 */
import type { NewsCity } from '@prisma/client';
import type { NewsProvider, RawArticle } from './types';
import { fetchGoogleNews, fetchRss, type FeedItem } from '../../infra-intel/fetchers';

export interface FeedSpec {
  label: string;
  kind: 'gnews' | 'rss';
  /** Google News query, or RSS URL */
  target: string;
  /** Keep only items that mention the city (national feeds used for a city). */
  requireCityMention?: boolean;
  /** Keep only items with an Indian reference (India-wide search results leak UK/US stories). */
  requireIndia?: boolean;
}

const INDIA_RE = /\b(india|indian|crore|lakh|rera|nhai|rbi|telangana|andhra|karnataka|tamil nadu|maharashtra|kerala|gujarat|uttar pradesh|delhi|mumbai|bengaluru|bangalore|hyderabad|chennai|pune|kolkata|noida|gurugram|gurgaon|ahmedabad|jaipur|lucknow|kochi|visakhapatnam|amaravati|goa)\b|₹|\brs\.?\s?\d/i;

export function mentionsIndia(text: string): boolean {
  return INDIA_RE.test(text);
}

const STATE_NAME: Record<string, string> = {
  TG: 'Telangana',
  AP: 'Andhra Pradesh',
  KA: 'Karnataka',
  TN: 'Tamil Nadu',
  MH: 'Maharashtra',
  DL: 'Delhi',
};

const NATIONAL_FEEDS: FeedSpec[] = [
  { label: 'ETRealty', kind: 'rss', target: 'https://realty.economictimes.indiatimes.com/rss/topstories' },
  { label: 'The Economic Times', kind: 'rss', target: 'https://economictimes.indiatimes.com/industry/services/property-/-cstruction/rssfeeds/13358350.cms' },
  { label: 'Hindustan Times', kind: 'rss', target: 'https://www.hindustantimes.com/feeds/rss/real-estate/rssfeed.xml' },
];

const CITY_FEEDS: Record<string, FeedSpec[]> = {
  hyderabad: [
    { label: 'The Hindu', kind: 'rss', target: 'https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss' },
    { label: 'The Times of India', kind: 'rss', target: 'https://timesofindia.indiatimes.com/rssfeeds/-2128816011.cms' },
  ],
};

/** City-specific rules & regulation vocabulary (the things that change what a buyer pays or may build). */
const CITY_RULE_TERMS: Record<string, string> = {
  hyderabad: '(Telangana OR Hyderabad) ("TG RERA" OR "Telangana RERA" OR "Bhu Bharati" OR Dharani OR "TG-bPASS" OR LRS OR "stamp duty" OR "registration charges" OR "market value" OR "master plan" OR HYDRAA)',
};

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

const quote = (t: string) => (/\s/.test(t) ? `"${t}"` : t);

/** Which feeds to read for a city. Pure — unit tested. */
export function feedsForCity(city: Pick<NewsCity, 'slug' | 'name' | 'stateCode' | 'queryTerms'>): FeedSpec[] {
  if (city.slug === 'india') {
    return [
      ...NATIONAL_FEEDS,
      { label: 'India real estate', kind: 'gnews', target: 'India (real estate OR housing sales OR property prices OR land deal) -cricket', requireIndia: true },
      { label: 'India property rules', kind: 'gnews', target: 'India (RERA OR "stamp duty" OR "home loan" OR "repo rate" OR REIT OR "property tax") real estate', requireIndia: true },
      { label: 'India infrastructure', kind: 'gnews', target: 'India (NHAI OR expressway OR metro OR airport OR "industrial corridor") project crore', requireIndia: true },
    ];
  }
  const place = city.name;
  const state = city.stateCode ? STATE_NAME[city.stateCode] ?? '' : '';
  const specs: FeedSpec[] = [
    { label: `${place} real estate`, kind: 'gnews', target: `${place} (real estate OR property OR housing OR apartments OR plots OR "land prices" OR villas)` },
    { label: `${place} infrastructure`, kind: 'gnews', target: `${place} (metro OR flyover OR highway OR "ring road" OR airport OR "road widening" OR "infrastructure project")` },
    {
      label: `${state || place} rules & regulations`,
      kind: 'gnews',
      target: CITY_RULE_TERMS[city.slug] ?? `${state || place} (RERA OR "stamp duty" OR "registration charges" OR "property tax" OR "building permission" OR "master plan")`,
      // Regulation vocabulary is global (UK stamp duty, NSW …) — keep only items that name our city/state.
      requireCityMention: true,
    },
  ];
  // The city's own watch-list (HMDA, Kokapet, Pharma City …), four terms per query.
  for (const group of chunk(city.queryTerms, 4).slice(0, 4)) {
    specs.push({ label: `${place} watch-list`, kind: 'gnews', target: group.map(quote).join(' OR ') });
  }
  specs.push(...(CITY_FEEDS[city.slug] ?? []));
  specs.push(...NATIONAL_FEEDS.map((f) => ({ ...f, requireCityMention: true })));
  return specs;
}

/** Does an item mention the city (or its state / signature terms)? */
export function mentionsCity(text: string, city: Pick<NewsCity, 'name' | 'stateCode' | 'queryTerms'>): boolean {
  const t = text.toLowerCase();
  const terms = [city.name, city.stateCode ? STATE_NAME[city.stateCode] : null, ...city.queryTerms.filter((q) => !/\s/.test(q))]
    .filter((x): x is string => !!x && x.length >= 3)
    .map((x) => x.toLowerCase());
  return terms.some((x) => t.includes(x));
}

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function toRaw(it: FeedItem, spec: FeedSpec): RawArticle | null {
  if (!it.title || !it.url) return null;
  const publisher = it.publisher || spec.label;
  return {
    headline: it.title.trim(),
    sourceName: publisher,
    sourceDomain: spec.kind === 'rss' ? domainOf(it.url) : undefined,
    canonicalUrl: it.url,
    publishedAt: it.publishedAt ?? new Date(),
    blurb: it.summary ? it.summary.slice(0, 300) : undefined,
  };
}

const FEED_TIMEOUT_MS = 9000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

export interface FeedResult {
  label: string;
  ok: boolean;
  items: number;
  error?: string;
}

export class LiveFeedsProvider implements NewsProvider {
  readonly name = 'live-feeds';
  lastResults: FeedResult[] = [];

  async fetchForCity(city: NewsCity, sinceDate: Date): Promise<RawArticle[]> {
    const specs = feedsForCity(city);
    const windowDays = Math.min(14, Math.max(2, Math.ceil((Date.now() - sinceDate.getTime()) / 86400000) + 1));
    const settled = await Promise.allSettled(
      specs.map((s) => withTimeout(s.kind === 'gnews' ? fetchGoogleNews(s.target, windowDays) : fetchRss(s.target), FEED_TIMEOUT_MS)),
    );
    const out: RawArticle[] = [];
    const floor = new Date(Date.now() - 14 * 86400000);
    this.lastResults = settled.map((r, i) => {
      const spec = specs[i];
      if (r.status === 'rejected') return { label: spec.label, ok: false, items: 0, error: r.reason instanceof Error ? r.reason.message : String(r.reason) };
      let kept = 0;
      for (const it of r.value) {
        const itemText = `${it.title} ${it.summary ?? ''}`;
        if (spec.requireCityMention && !mentionsCity(itemText, city)) continue;
        if (spec.requireIndia && !mentionsIndia(itemText)) continue;
        const raw = toRaw(it, spec);
        if (raw && raw.publishedAt >= floor) {
          out.push(raw);
          kept++;
        }
      }
      return { label: spec.label, ok: true, items: kept };
    });
    if (this.lastResults.every((r) => !r.ok)) throw new Error(`all ${specs.length} feeds failed`);
    return out;
  }

  async healthCheck() {
    try {
      const items = await fetchRss(NATIONAL_FEEDS[0].target);
      return { ok: items.length > 0 };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }
}
