/**
 * NewsData.io adapter — SCAFFOLD ONLY (News module spec, Part 2.2).
 *
 * TODO(live): verify these fields against current provider docs before enabling.
 * Confirm the plan permits COMMERCIAL use and headline display. Free/dev tiers on
 * several providers prohibit production use. STRIP any body/content and image
 * fields in mapToRawArticle() — see spec Part 0 constraints 1 and 2.
 */

import type { NewsCity } from '@prisma/client';
import type { NewsProvider, RawArticle } from './types';

const BASE = 'https://newsdata.io/api/1/news';

interface NewsDataItem {
  title: string;
  link: string;
  source_id?: string;
  source_url?: string;
  pubDate?: string;
  description?: string;
  // Provider also returns `content`, `image_url`, `full_description` — we DISCARD
  // these on purpose (Part 0 constraints 1 & 2). Do not map them below.
  [k: string]: unknown;
}

function mapToRawArticle(item: NewsDataItem): RawArticle {
  return {
    headline: item.title,
    sourceName: item.source_id ?? item.source_url ?? 'Unknown',
    sourceDomain: item.source_url,
    canonicalUrl: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    blurb: item.description,
    // DELIBERATELY NOT MAPPED: item.content, item.full_description, item.image_url.
    // Storing article body or hotlinking publisher images is prohibited. Do not
    // re-add them here — the guard test and legal constraint both forbid it.
  };
}

export class NewsDataProvider implements NewsProvider {
  readonly name = 'newsdata';
  private key = process.env.NEWSDATA_API_KEY;

  private assertKey() {
    if (!this.key) throw new Error('NEWSDATA_API_KEY not configured');
  }

  async fetchForCity(city: NewsCity, _sinceDate: Date): Promise<RawArticle[]> {
    this.assertKey();
    // Request shape (verify against live docs): q = OR-joined queryTerms, country=in,
    // language=en, category=business, with page-token pagination and rate-limit backoff.
    const q = city.queryTerms.length ? city.queryTerms.join(' OR ') : city.name;
    const url = `${BASE}?apikey=${this.key}&q=${encodeURIComponent(q)}&country=in&language=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`newsdata ${res.status}`);
    const json = (await res.json()) as { results?: NewsDataItem[] };
    return (json.results ?? []).map(mapToRawArticle);
  }

  async healthCheck() {
    return this.key ? { ok: true } : { ok: false, detail: 'NEWSDATA_API_KEY not configured' };
  }
}
