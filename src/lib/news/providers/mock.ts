/**
 * MockProvider (News module spec, Part 2.1). Fully functional with no API key.
 * Simulates realism: latency, occasional duplicates (exercise dedupe) and
 * occasional network errors (exercise retry). Timestamps roll relative to now.
 */

import type { NewsCity } from '@prisma/client';
import type { NewsProvider, RawArticle } from './types';
import { MOCK_ARTICLES, type MockArticle } from '../mock-data/articles';

const INDIA_SLICE = 6; // non-india cities also get a slice of national items

function toRaw(m: MockArticle): RawArticle {
  return {
    headline: m.headline,
    sourceName: m.sourceName,
    sourceDomain: m.sourceDomain,
    canonicalUrl: m.canonicalUrl,
    publishedAt: new Date(Date.now() - m.minutesAgo * 60_000), // rolling timestamp
    blurb: m.blurb,
  };
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockProvider implements NewsProvider {
  readonly name = 'mock';

  async fetchForCity(city: NewsCity, sinceDate: Date): Promise<RawArticle[]> {
    await delay(300 + Math.random() * 600); // 300–900ms

    if (Math.random() < 0.03) {
      throw new Error('[mock] simulated network error'); // exercise retry logic
    }

    const local = MOCK_ARTICLES.filter((a) => a.cityScope === city.slug);
    const national =
      city.slug === 'india' ? [] : MOCK_ARTICLES.filter((a) => a.cityScope === 'india').slice(0, INDIA_SLICE);

    const raw = [...local, ...national].map(toRaw).filter((a) => a.publishedAt >= sinceDate);

    if (Math.random() < 0.05 && raw.length > 0) {
      raw.push({ ...raw[0] }); // 5%: emit an exact duplicate to exercise dedupe
    }
    return raw;
  }

  async healthCheck() {
    return { ok: true, detail: 'mock provider — no external calls' };
  }
}
