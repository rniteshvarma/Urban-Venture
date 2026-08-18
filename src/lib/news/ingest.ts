/**
 * Ingestion pipeline (News module spec, Part 4): fetch → dedupe → relevance
 * filter → enrich → store → prune. Every stage is counted on the run record.
 * In mock mode the AI enrichment step is skipped — the mock data already carries
 * category/sentiment/impact/analysis/entities.
 */

import type { NewsCategory, NewsSentiment, NewsIngestRun } from '@prisma/client';
import prisma from '../prisma';
import { getProvider, isMockMode, type RawArticle } from './providers';
import { MOCK_ARTICLES } from './mock-data/articles';
import { dedupeHash, visualSeed } from './dedupe';
import { CATEGORY_PALETTE, isRelevant } from './categories';

const PRUNE_DAYS = 90;
const MAX_RETRIES = 3;

interface Enrichment {
  relevant: boolean;
  category: NewsCategory;
  sentiment: NewsSentiment;
  impactScore: number;
  corridorSlugs: string[];
  infraProjectIds: string[];
  authorities: string[];
  goReferences: string[];
  analysis: string | null;
  suppressed?: boolean;
  cityScope?: string;
  stateScope?: string | null;
}

const mockByUrl = new Map(MOCK_ARTICLES.map((m) => [m.canonicalUrl, m]));

/** Mock-mode enrichment passthrough (spec Part 3): read the pre-computed fields. */
function mockEnrichment(url: string): Enrichment | null {
  const m = mockByUrl.get(url);
  if (!m) return null;
  return {
    relevant: true,
    category: m.category,
    sentiment: m.sentiment,
    impactScore: m.impactScore,
    corridorSlugs: m.corridorSlugs,
    infraProjectIds: m.infraProjectIds ?? [],
    authorities: m.authorities ?? [],
    goReferences: m.goReferences ?? [],
    analysis: m.ourAnalysis,
    suppressed: m.suppressed,
    cityScope: m.cityScope,
    stateScope: m.stateScope ?? null,
  };
}

async function fetchWithRetry(fetchFn: () => Promise<RawArticle[]>): Promise<RawArticle[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchFn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 200 * attempt)); // simple backoff
    }
  }
  throw lastErr;
}

export async function ingestCity(citySlug: string): Promise<NewsIngestRun> {
  const provider = getProvider();
  const city = await prisma.newsCity.findUnique({ where: { slug: citySlug } });
  if (!city) throw new Error(`Unknown news city: ${citySlug}`);

  const run = await prisma.newsIngestRun.create({
    data: { provider: provider.name, cityScope: citySlug, status: 'RUNNING' },
  });

  let fetched = 0, duplicates = 0, filteredOut = 0, enriched = 0, stored = 0;
  let status = 'SUCCESS';
  let errorSummary: string | null = null;

  try {
    if (isMockMode()) console.log('[news] mock mode — skipping AI enrichment');

    // 1. Fetch (since last ingest, else 48h back).
    const since = city.lastIngestAt ?? new Date(Date.now() - 48 * 3600_000);
    const raw = await fetchWithRetry(() => provider.fetchForCity(city, since));
    fetched = raw.length;

    // 2. Dedupe — exact by canonicalUrl within the batch, fuzzy by dedupeHash.
    const seenUrls = new Set<string>();
    const seenHashes = new Set<string>();
    const unique: RawArticle[] = [];
    for (const a of raw) {
      const h = dedupeHash(a.headline);
      if (seenUrls.has(a.canonicalUrl) || seenHashes.has(h)) {
        duplicates++;
        continue;
      }
      seenUrls.add(a.canonicalUrl);
      seenHashes.add(h);
      unique.push(a);
    }

    // 3. Relevance filter + blocked sources.
    const blocked = new Set(
      (await prisma.newsSource.findMany({ where: { isBlocked: true }, select: { name: true } })).map((s) => s.name),
    );
    const relevant = unique.filter((a) => {
      if (blocked.has(a.sourceName)) return false;
      const ok = isMockMode() || isRelevant(`${a.headline} ${a.blurb ?? ''}`, city.excludeTerms);
      if (!ok) filteredOut++;
      return ok;
    });

    // 4. Enrich (mock passthrough; live would call Claude here).
    // 5. Store.
    for (const a of relevant) {
      const enr = isMockMode() ? mockEnrichment(a.canonicalUrl) : null;
      if (!enr || !enr.relevant) {
        filteredOut++;
        continue;
      }
      enriched++;

      const id = crypto.randomUUID();
      const category = enr.category;
      const data = {
        headline: a.headline,
        sourceName: a.sourceName,
        sourceDomain: a.sourceDomain ?? null,
        canonicalUrl: a.canonicalUrl,
        publishedAt: a.publishedAt,
        providerBlurb: a.blurb ?? null,
        cityScope: enr.cityScope ?? city.slug,
        stateScope: enr.stateScope ?? city.stateCode ?? null,
        ourAnalysis: enr.analysis,
        category,
        sentiment: enr.sentiment,
        impactScore: enr.impactScore,
        corridorSlugs: enr.corridorSlugs,
        infraProjectIds: enr.infraProjectIds,
        authorities: enr.authorities,
        goReferences: enr.goReferences,
        visualSeed: visualSeed(a.canonicalUrl),
        visualPalette: CATEGORY_PALETTE[category],
        provider: provider.name,
        dedupeHash: dedupeHash(a.headline),
        suppressedAt: enr.suppressed ? new Date() : null,
        suppressReason: enr.suppressed ? 'seeded suppressed (mock hard-case)' : null,
        enrichedAt: new Date(),
      };

      await prisma.newsArticle.upsert({
        where: { canonicalUrl: a.canonicalUrl },
        update: {
          // Never overwrite an admin takedown or edited analysis on re-ingest.
          headline: data.headline,
          publishedAt: data.publishedAt,
          impactScore: data.impactScore,
        },
        create: { id, ...data },
      });

      // Track the source for trust-tier / block management.
      await prisma.newsSource.upsert({
        where: { name: a.sourceName },
        update: { articleCount: { increment: 1 } },
        create: { name: a.sourceName, domain: a.sourceDomain ?? null, articleCount: 1 },
      });
      stored++;
    }

    // 6. Prune — nothing accumulates indefinitely.
    await prisma.newsArticle.deleteMany({
      where: { publishedAt: { lt: new Date(Date.now() - PRUNE_DAYS * 86400_000) } },
    });

    // Denormalised city counter.
    const count = await prisma.newsArticle.count({
      where: { cityScope: city.slug, suppressedAt: null, isPublished: true },
    });
    await prisma.newsCity.update({
      where: { id: city.id },
      data: { articleCount: count, lastIngestAt: new Date() },
    });
  } catch (err) {
    status = 'FAILED';
    errorSummary = err instanceof Error ? err.message : String(err);
  }

  return prisma.newsIngestRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), status, fetched, duplicates, filteredOut, enriched, stored, errorSummary },
  });
}

/** Ingest every active city (used by the cron). */
export async function ingestAllCities(): Promise<NewsIngestRun[]> {
  const cities = await prisma.newsCity.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
  const runs: NewsIngestRun[] = [];
  for (const c of cities) runs.push(await ingestCity(c.slug));
  return runs;
}
