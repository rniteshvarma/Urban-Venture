/**
 * /news — City feed (News module spec, Part 7). Server-rendered first page
 * (fast paint + SEO). All reads go through buildFeedWhere so suppressed articles
 * and blocked sources can never appear.
 */

import React from 'react';
import { cookies } from 'next/headers';
import type { NewsCategory, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { buildFeedWhere } from '@/lib/news/query';
import { isMockMode } from '@/lib/news/providers';
import { ALL_CATEGORIES } from '@/lib/news/categories';
import { relativeTime } from '@/lib/news/format';
import NewsCard, { type CorridorChip } from '@/components/news/NewsCard';
import NewsFilters from '@/components/news/NewsFilters';
import SampleDataBanner from '@/components/news/SampleDataBanner';

export const revalidate = 60;

const PAGE_SIZE = 18;

type SP = Promise<{ city?: string; category?: string; minImpact?: string; sort?: string }>;

async function resolveCity(paramCity?: string): Promise<string> {
  if (paramCity) return paramCity;
  const cookieCity = (await cookies()).get('news_city')?.value;
  if (cookieCity) return cookieCity;
  return 'india';
}

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = ALL_CATEGORIES.includes(sp.category as NewsCategory) ? (sp.category as NewsCategory) : null;
  const minImpact = sp.minImpact ? Number(sp.minImpact) : 0;
  const sort = sp.sort === 'impact' ? 'impact' : 'latest';

  const cities = await prisma.newsCity.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
  let city = await resolveCity(sp.city);
  if (!cities.some((c) => c.slug === city)) city = 'india';

  const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
    sort === 'impact'
      ? [{ isPinned: 'desc' }, { impactScore: 'desc' }, { publishedAt: 'desc' }]
      : [{ isPinned: 'desc' }, { publishedAt: 'desc' }];

  const extra: Prisma.NewsArticleWhereInput = {
    cityScope: city,
    ...(category ? { category } : {}),
    ...(minImpact ? { impactScore: { gte: minImpact } } : {}),
  };

  let articles = await prisma.newsArticle.findMany({ where: await buildFeedWhere(extra), orderBy, take: PAGE_SIZE });

  // Empty city coverage → fall back to India-wide (spec Part 7.5).
  let fellBackToIndia = false;
  if (articles.length === 0 && city !== 'india') {
    fellBackToIndia = true;
    articles = await prisma.newsArticle.findMany({
      where: await buildFeedWhere({ cityScope: 'india', ...(category ? { category } : {}), ...(minImpact ? { impactScore: { gte: minImpact } } : {}) }),
      orderBy,
      take: PAGE_SIZE,
    });
  }

  // Corridor chips: resolve scores for every referenced slug.
  const slugs = [...new Set(articles.flatMap((a) => a.corridorSlugs))];
  const corridorRows = slugs.length
    ? await prisma.corridorProfile.findMany({ where: { slug: { in: slugs } }, select: { slug: true, shortName: true, overallScore: true } })
    : [];
  const corridorMap = new Map<string, CorridorChip>(corridorRows.map((c) => [c.slug, { slug: c.slug, name: c.shortName, score: c.overallScore }]));
  const chipsFor = (a: (typeof articles)[number]): CorridorChip[] =>
    a.corridorSlugs.map((s) => corridorMap.get(s)).filter((c): c is CorridorChip => !!c);

  const updatedAgo = articles.length ? relativeTime(articles.reduce((m, a) => (a.ingestedAt > m ? a.ingestedAt : m), articles[0].ingestedAt)) : null;
  const cityName = cities.find((c) => c.slug === city)?.name ?? 'All India';
  const lockedBanner = process.env.NODE_ENV === 'production' && isMockMode();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 80px' }}>
      {/* Header strip */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '1.9rem', color: 'var(--color-text-hi)', margin: 0 }}>Market Signals</h1>
        <p style={{ color: 'var(--color-text-lo)', marginTop: 4, fontSize: '0.9rem', maxWidth: 640 }}>
          Real estate and infrastructure news, read for what it means for land investors.
          {updatedAgo && <> · <span>updated {updatedAgo}</span></>}
        </p>
        <div style={{ marginTop: 16 }}>
          <NewsFilters cities={cities.map((c) => ({ slug: c.slug, name: c.name, articleCount: c.articleCount }))} city={city} category={category} minImpact={minImpact} sort={sort} />
        </div>
      </header>

      {isMockMode() && (
        <div style={{ marginBottom: 18 }}>
          <SampleDataBanner locked={lockedBanner} />
        </div>
      )}

      {fellBackToIndia && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-lo)', marginBottom: 14 }}>
          We&rsquo;re still building coverage for {cityName}. Showing India-wide signals below.
        </p>
      )}

      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-text-lo)' }}>
          <p style={{ fontSize: '1rem' }}>No {category ? category.toLowerCase().replace('_', ' ') : ''} stories in the last 7 days.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {articles.map((a) => (
            <NewsCard key={a.id} article={a} corridors={chipsFor(a)} />
          ))}
        </div>
      )}
    </div>
  );
}
