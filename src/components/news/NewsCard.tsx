/**
 * News card (News module spec, Part 7.2). Server component.
 *
 * Legal-critical UI guarantees:
 *  - headline stored/shown verbatim with mandatory source + relative-time attribution
 *  - "OUR TAKE" is visually separated (saffron wash + left border) so it is
 *    unmistakable which words are ours vs the publisher's
 *  - the only outbound link is target=_blank rel="noopener nofollow"
 *  - the visual is generated (GeneratedNewsVisual), never a publisher image
 */

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { NewsArticle, NewsSentiment } from '@prisma/client';
import GeneratedNewsVisual from './GeneratedNewsVisual';
import { relativeTime } from '@/lib/news/format';
import { CATEGORY_LABEL } from '@/lib/news/categories';

const SENTIMENT_BORDER: Record<NewsSentiment, string> = {
  POSITIVE: 'var(--color-growth)',
  NEUTRAL: 'var(--color-line)',
  NEGATIVE: '#B45309',
  MIXED: 'var(--color-saffron)',
};

export interface CorridorChip {
  slug: string;
  name: string;
  score?: number | null;
}

export default function NewsCard({
  article,
  corridors,
}: {
  article: NewsArticle;
  corridors: CorridorChip[];
}) {
  return (
    <article
      style={{
        background: 'var(--color-surface-raised, var(--color-surface))',
        border: '1px solid var(--color-line)',
        borderTop: `3px solid ${SENTIMENT_BORDER[article.sentiment]}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ aspectRatio: '16 / 9', width: '100%', overflow: 'hidden', flexShrink: 0 }}>
        <GeneratedNewsVisual
          seed={article.visualSeed}
          category={article.category}
          impactScore={article.impactScore}
          headline={article.headline}
          sentiment={article.sentiment}
        />
      </div>

      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div>
          {/* Headline — 2 lines with consistent min-height for perfect row alignment */}
          <h3
            style={{
              fontFamily: '"Plus Jakarta Sans", var(--font-sans, sans-serif)',
              fontWeight: 700,
              fontSize: '1.02rem',
              lineHeight: 1.35,
              color: 'var(--color-text-hi)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.75rem',
            }}
            title={article.headline}
          >
            {article.headline}
          </h3>

          {/* Attribution */}
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-lo)', marginTop: 4 }}>
            {article.sourceName} · {relativeTime(article.publishedAt)}
          </div>
        </div>

        {/* OUR TAKE — visually distinct & flexible */}
        {article.ourAnalysis && (
          <div style={{ background: 'var(--color-saffron-wash)', borderLeft: '3px solid var(--color-saffron)', borderRadius: 6, padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.6rem', letterSpacing: 1.4, color: 'var(--color-saffron-deep, var(--color-saffron))', textTransform: 'uppercase', marginBottom: 5 }}>
              Our take
            </div>
            <p style={{ margin: 0, fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--color-text-mid)' }}>{article.ourAnalysis}</p>
          </div>
        )}

        {/* Corridor chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: corridors.length > 0 ? 28 : 0, alignItems: 'center' }}>
          {corridors.map((c) => (
            <Link
              key={c.slug}
              href={`/market/${c.slug}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-mid)', background: 'var(--color-surface-dim, var(--color-surface))', border: '1px solid var(--color-line)', borderRadius: 999, padding: '3px 9px', textDecoration: 'none' }}
            >
              {c.name}
              {typeof c.score === 'number' && <span style={{ color: 'var(--color-saffron)' }}>★{c.score}</span>}
            </Link>
          ))}
        </div>

        {/* Outbound Link pinned to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--color-line)' }}>
          <a
            href={article.canonicalUrl}
            target="_blank"
            rel="noopener nofollow"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-text-accent, var(--color-saffron))', textDecoration: 'none' }}
          >
            Read full story at {article.sourceName} <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </article>
  );
}
