/**
 * Category metadata + the relevance lexicon (News module spec, Parts 4 & 5).
 */

import type { NewsCategory } from '@prisma/client';

/** Palette key per category — drives GeneratedNewsVisual (spec Part 5). */
export const CATEGORY_PALETTE: Record<NewsCategory, string> = {
  INFRASTRUCTURE: 'ink-saffron',
  POLICY_REGULATION: 'navy-paper',
  MARKET_PRICES: 'growth-ink',
  PROJECT_LAUNCH: 'saffron-paper',
  INDUSTRIAL_JOBS: 'slate-amber',
  LEGAL_DISPUTES: 'rust-paper',
  CIVIC_UTILITIES: 'teal-paper',
  MACRO_FINANCE: 'navy-gold',
};

export const CATEGORY_LABEL: Record<NewsCategory, string> = {
  INFRASTRUCTURE: 'Infrastructure',
  POLICY_REGULATION: 'Policy',
  MARKET_PRICES: 'Prices',
  PROJECT_LAUNCH: 'Projects',
  INDUSTRIAL_JOBS: 'Industry',
  LEGAL_DISPUTES: 'Legal',
  CIVIC_UTILITIES: 'Civic',
  MACRO_FINANCE: 'Macro',
};

export const ALL_CATEGORIES: NewsCategory[] = Object.keys(CATEGORY_PALETTE) as NewsCategory[];

/** First-pass relevance gate — an article must match at least one of these. */
export const RELEVANCE_LEXICON = [
  'land', 'plot', 'realty', 'real estate', 'property', 'hmda', 'dtcp', 'rera',
  'metro', 'highway', 'orr', 'rrr', 'sez', 'layout', 'registration', 'stamp duty',
  'corridor', 'township', 'acquisition', 'master plan', 'infrastructure',
  'industrial park', 'tsiic', 'ghmc', 'allotment', 'zoning', 'circle rate',
];

export function isRelevant(text: string, excludeTerms: string[] = []): boolean {
  const t = text.toLowerCase();
  if (excludeTerms.some((x) => x && t.includes(x.toLowerCase()))) return false;
  return RELEVANCE_LEXICON.some((term) => t.includes(term));
}
