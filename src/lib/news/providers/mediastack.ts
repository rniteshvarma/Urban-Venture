/**
 * Mediastack adapter — SCAFFOLD ONLY (News module spec, Part 2.2).
 *
 * TODO(live): verify these fields against current provider docs before enabling.
 * Confirm the plan permits COMMERCIAL use and headline display. Free/dev tiers on
 * several providers prohibit production use. STRIP any body/content and image
 * fields in mapToRawArticle() — see spec Part 0 constraints 1 and 2.
 */

import type { NewsCity } from '@prisma/client';
import type { NewsProvider, RawArticle } from './types';

const BASE = 'http://api.mediastack.com/v1/news';

interface MediastackItem {
  title: string;
  url: string;
  source?: string;
  published_at?: string;
  description?: string;
  // Provider also returns `image` — DISCARDED on purpose (Part 0 constraint 2).
  [k: string]: unknown;
}

function mapToRawArticle(item: MediastackItem): RawArticle {
  let domain: string | undefined;
  try {
    domain = new URL(item.url).hostname;
  } catch {
    domain = undefined;
  }
  return {
    headline: item.title,
    sourceName: item.source ?? domain ?? 'Unknown',
    sourceDomain: domain,
    canonicalUrl: item.url,
    publishedAt: item.published_at ? new Date(item.published_at) : new Date(),
    blurb: item.description,
    // DELIBERATELY NOT MAPPED: item.image (and any body/content). Prohibited by
    // Part 0 constraints 1 & 2 — do not re-add.
  };
}

export class MediastackProvider implements NewsProvider {
  readonly name = 'mediastack';
  private key = process.env.MEDIASTACK_API_KEY;

  async fetchForCity(city: NewsCity, _sinceDate: Date): Promise<RawArticle[]> {
    if (!this.key) throw new Error('MEDIASTACK_API_KEY not configured');
    const keywords = city.queryTerms.length ? city.queryTerms.join(',') : city.name;
    const url = `${BASE}?access_key=${this.key}&keywords=${encodeURIComponent(keywords)}&countries=in&languages=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`mediastack ${res.status}`);
    const json = (await res.json()) as { data?: MediastackItem[] };
    return (json.data ?? []).map(mapToRawArticle);
  }

  async healthCheck() {
    return this.key ? { ok: true } : { ok: false, detail: 'MEDIASTACK_API_KEY not configured' };
  }
}
