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
import { ensureNewsCities } from '@/lib/news/seed-cities';
import { isMockMode } from '@/lib/news/providers';
import { ALL_CATEGORIES } from '@/lib/news/categories';
import { relativeTime } from '@/lib/news/format';
import NewsCard, { type CorridorChip } from '@/components/news/NewsCard';
import NewsFilters from '@/components/news/NewsFilters';
import SampleDataBanner from '@/components/news/SampleDataBanner';
import LiveNewsUpdater from '@/components/news/LiveNewsUpdater';
import { feedsForCity } from '@/lib/news/providers/live';
import { CATEGORY_LABEL } from '@/lib/news/categories';

// Always render fresh: LiveNewsUpdater pulls new stories and calls router.refresh().
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 18;

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600_000);
}

type SP = Promise<{ city?: string; category?: string; minImpact?: string; sort?: string; page?: string }>;

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
  const requestedPage = Math.max(1, Math.floor(Number(sp.page) || 1));

  const cityQuery = { where: { isActive: true }, orderBy: { displayOrder: 'asc' as const } };
  let cities = await prisma.newsCity.findMany(cityQuery);
  if (cities.length === 0) {
    // Fresh database: create the default cities so the live refresh has feeds to pull.
    await ensureNewsCities();
    cities = await prisma.newsCity.findMany(cityQuery);
  }
  let city = await resolveCity(sp.city);
  if (!cities.some((c) => c.slug === city)) city = 'india';

  // `id` breaks publishedAt ties (common in RSS), so pages never repeat or skip a story.
  const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
    sort === 'impact'
      ? [{ isPinned: 'desc' }, { impactScore: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }]
      : [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }];

  // "All India" is the union of every city's feed plus national stories.
  const extra: Prisma.NewsArticleWhereInput = {
    ...(city === 'india' ? {} : { cityScope: city }),
    ...(category ? { category } : {}),
    ...(minImpact ? { impactScore: { gte: minImpact } } : {}),
  };

  let where = await buildFeedWhere(extra);
  let total = await prisma.newsArticle.count({ where });

  // Empty city coverage → fall back to India-wide (spec Part 7.5).
  let fellBackToIndia = false;
  if (total === 0 && city !== 'india') {
    fellBackToIndia = true;
    where = await buildFeedWhere({ cityScope: 'india', ...(category ? { category } : {}), ...(minImpact ? { impactScore: { gte: minImpact } } : {}) });
    total = await prisma.newsArticle.count({ where });
  }

  // Newest first, PAGE_SIZE per page: new stories land on page 1 and push older
  // ones onto later pages. Nothing is hidden for its age (ingest prunes at 90 days).
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, lastPage);
  const articles = await prisma.newsArticle.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  const pageHref = (p: number) => {
    const q = new URLSearchParams({ city });
    if (category) q.set('category', category);
    if (minImpact) q.set('minImpact', String(minImpact));
    if (sort !== 'latest') q.set('sort', sort);
    if (p > 1) q.set('page', String(p));
    return `/news?${q.toString()}`;
  };

  // Corridor chips: resolve scores for every referenced slug.
  const slugs = [...new Set(articles.flatMap((a) => a.corridorSlugs))];
  const corridorRows = slugs.length
    ? await prisma.corridorProfile.findMany({ where: { slug: { in: slugs } }, select: { slug: true, shortName: true, overallScore: true } })
    : [];
  const corridorMap = new Map<string, CorridorChip>(corridorRows.map((c) => [c.slug, { slug: c.slug, name: c.shortName, score: c.overallScore }]));
  const chipsFor = (a: (typeof articles)[number]): CorridorChip[] =>
    a.corridorSlugs.map((s) => corridorMap.get(s)).filter((c): c is CorridorChip => !!c);

  // Last-24h brief: what kind of news moved today (informative, links to the filter).
  const dayAgo = hoursAgo(24);
  const brief = await prisma.newsArticle.groupBy({
    by: ['category'],
    where: await buildFeedWhere({ ...(city === 'india' ? {} : { cityScope: city }), publishedAt: { gte: dayAgo } }),
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  });
  const cityRow = cities.find((c) => c.slug === city);
  const sourceCount = cityRow ? feedsForCity(cityRow).length : 0;
  const publishers = [...new Set(articles.map((a) => a.sourceName))].sort();

  // Only page 1 holds the newest stories, so only it can say when the feed last moved.
  const updatedAgo = page === 1 && articles.length ? relativeTime(articles.reduce((m, a) => (a.ingestedAt > m ? a.ingestedAt : m), articles[0].ingestedAt)) : null;
  const cityName = cities.find((c) => c.slug === city)?.name ?? 'All India';
  const lockedBanner = process.env.NODE_ENV === 'production' && isMockMode();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 80px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      {/* Header strip */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '1.9rem', color: 'var(--color-text-hi)', margin: 0 }}>Market Signals</h1>
        <p style={{ color: 'var(--color-text-lo)', marginTop: 4, fontSize: '0.9rem', maxWidth: 640 }}>
          Real estate and infrastructure news, read for what it means for land investors.
          {updatedAgo && <> · <span>updated {updatedAgo}</span></>}
        </p>
        {!isMockMode() && (
          <div style={{ marginTop: 10 }}>
            <LiveNewsUpdater key={city} city={city} sourceCount={sourceCount} />
          </div>
        )}
        {brief.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--color-text-lo)', fontWeight: 600 }}>Last 24 hours:</span>
            {brief.map((b) => (
              <a
                key={b.category}
                href={`/news?city=${city}&category=${b.category}`}
                style={{ textDecoration: 'none', color: 'var(--color-text-mid)', border: '1px solid var(--color-line)', borderRadius: 999, padding: '2px 10px' }}
              >
                {b._count} {CATEGORY_LABEL[b.category]}
              </a>
            ))}
          </div>
        )}
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
          <p style={{ fontSize: '1rem' }}>
            {category || minImpact
              ? `No ${category ? `${CATEGORY_LABEL[category].toLowerCase()} ` : ''}stories match these filters yet.`
              : 'No stories yet. We’re checking the sources now, and new stories will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 22, alignItems: 'stretch' }}>
          {articles.map((a) => (
            <NewsCard key={a.id} article={a} corridors={chipsFor(a)} />
          ))}
        </div>
      )}

      {lastPage > 1 && <Pager page={page} lastPage={lastPage} total={total} sort={sort} href={pageHref} />}

      {/* Attribution & content policy — every headline belongs to its publisher. */}
      <footer style={{ marginTop: 48, paddingTop: 18, borderTop: '1px solid var(--color-line)', fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--color-text-lo)', maxWidth: 820 }}>
        <p style={{ margin: 0 }}>
          <strong style={{ color: 'var(--color-text-mid)' }}>About these stories.</strong> Headlines are shown exactly as published and belong to their
          publishers{publishers.length ? ` (${publishers.slice(0, 12).join(', ')}${publishers.length > 12 ? ' and others' : ''})` : ''}. We link to the original
          article and do not reproduce it or its images. &ldquo;Our take&rdquo; and &ldquo;Why it matters&rdquo; notes are Property Tiger&rsquo;s own commentary, not the
          publisher&rsquo;s, and are not legal or financial advice.{' '}
          <a href="/legal/content-policy" style={{ color: 'var(--color-text-mid)' }}>Content policy &amp; takedown requests</a>.
        </p>
      </footer>
    </div>
  );
}

/** Page numbers to show: first, last, and the current page's neighbours, with gaps. */
function pageList(page: number, last: number): (number | null)[] {
  const keep = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

const pagerLink: React.CSSProperties = {
  minWidth: 36,
  padding: '6px 12px',
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--color-line)',
  background: 'var(--color-surface, #fff)',
  color: 'var(--color-text-mid)',
  fontSize: '0.85rem',
  fontWeight: 600,
  textAlign: 'center',
  textDecoration: 'none',
};

function Pager({ page, lastPage, total, sort, href }: { page: number; lastPage: number; total: number; sort: string; href: (p: number) => string }) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const edge = (label: string, target: number, enabled: boolean) =>
    enabled ? (
      <a href={href(target)} style={pagerLink}>{label}</a>
    ) : (
      <span aria-disabled="true" style={{ ...pagerLink, opacity: 0.4 }}>{label}</span>
    );
  return (
    <nav aria-label="News pages" style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        {edge(sort === 'impact' ? '← Previous' : '← Newer', page - 1, page > 1)}
        {pageList(page, lastPage).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} style={{ color: 'var(--color-text-lo)' }}>…</span>
          ) : (
            <a
              key={p}
              href={href(p)}
              aria-current={p === page ? 'page' : undefined}
              style={p === page ? { ...pagerLink, background: 'var(--color-saffron)', borderColor: 'var(--color-saffron)', color: 'var(--color-ink)' } : pagerLink}
            >
              {p}
            </a>
          ),
        )}
        {edge(sort === 'impact' ? 'Next →' : 'Older →', page + 1, page < lastPage)}
      </div>
      <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: 'var(--color-text-lo)' }}>
        Stories {from}–{to} of {total}, {sort === 'impact' ? 'highest impact first' : 'newest first'}
      </p>
    </nav>
  );
}
