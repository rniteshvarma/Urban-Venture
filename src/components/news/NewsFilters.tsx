'use client';

/**
 * News feed controls (spec Part 7.1): city switcher, category chips, high-impact
 * toggle, sort. Updates the URL query (and persists the city cookie) — the page
 * re-renders server-side from the new params.
 */

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ALL_CATEGORIES, CATEGORY_LABEL } from '@/lib/news/categories';

interface CityOpt {
  slug: string;
  name: string;
  articleCount: number;
}

export default function NewsFilters({
  cities,
  city,
  category,
  minImpact,
  sort,
}: {
  cities: CityOpt[];
  city: string;
  category: string | null;
  minImpact: number;
  sort: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === '') q.delete(k);
      else q.set(k, v);
    }
    router.push(`/news?${q.toString()}`);
  }

  function onCity(slug: string) {
    document.cookie = `news_city=${slug}; path=/; max-age=${180 * 86400}`;
    update({ city: slug });
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    border: '1px solid var(--color-line)',
    background: active ? 'var(--color-saffron)' : 'transparent',
    color: active ? 'var(--color-ink)' : 'var(--color-text-mid)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={city}
          onChange={(e) => onCity(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-line)', background: 'var(--color-surface)', color: 'var(--color-text-hi)', fontWeight: 600, fontSize: '0.85rem' }}
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c.articleCount})
            </option>
          ))}
        </select>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-text-lo)' }}>
          <span className="news-live-dot" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--color-growth)', display: 'inline-block' }} />
          Live
        </span>
      </div>

      {/* Category chips — horizontally scrollable on mobile */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        <button type="button" style={chip(!category)} onClick={() => update({ category: null })}>All</button>
        {ALL_CATEGORIES.map((c) => (
          <button key={c} type="button" style={chip(category === c)} onClick={() => update({ category: c })}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--color-text-mid)', cursor: 'pointer' }}>
          <input type="checkbox" checked={minImpact >= 8} onChange={(e) => update({ minImpact: e.target.checked ? '8' : null })} />
          High impact only (8+)
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--color-text-lo)' }}>
          Sort:
          <select value={sort} onChange={(e) => update({ sort: e.target.value })} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-line)', background: 'var(--color-surface)', color: 'var(--color-text-hi)', fontSize: '0.8rem' }}>
            <option value="latest">Latest</option>
            <option value="impact">Impact</option>
          </select>
        </label>
      </div>
    </div>
  );
}
