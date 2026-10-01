/**
 * Category metadata + the relevance lexicon (News module spec, Parts 4 & 5).
 */

import type { NewsCategory } from '@prisma/client';

/** Palette key per category (spec Part 5). */
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
  POLICY_REGULATION: 'Rules & Policy',
  MARKET_PRICES: 'Prices',
  PROJECT_LAUNCH: 'Projects',
  INDUSTRIAL_JOBS: 'Industry',
  LEGAL_DISPUTES: 'Legal',
  CIVIC_UTILITIES: 'Civic',
  MACRO_FINANCE: 'Macro',
};

export const ALL_CATEGORIES: NewsCategory[] = Object.keys(CATEGORY_PALETTE) as NewsCategory[];

/**
 * Relevance gate for live news. Two tiers:
 *  - STRONG terms are about property, land, or the rules that govern them — enough on their own
 *  - WEAK terms (airport, metro, highway …) only count when the item also carries a
 *    development cue, so "dining at Novotel Hyderabad Airport" is out and
 *    "RGIA expansion gets ₹14,000 crore" is in
 * HARD_NOISE vetoes everything (stock-market "market value", crime, lifestyle).
 */
export const STRONG_TERMS = [
  'real estate', 'realty', 'property', 'properties', 'plot', 'plots', 'land', 'layout', 'housing', 'apartment',
  'villa', 'gated community', 'township', 'home loan', 'rera', 'stamp duty', 'registration charges', 'guideline value',
  'circle rate', 'property tax', 'building permission', 'bpass', 'b-pass', 'lrs', 'layout regular', 'master plan',
  'zoning', 'bhu bharati', 'dharani', 'land acquisition', 'land pooling', 'hmda', 'dtcp', 'hydraa', 'encroach',
  'demolition', 'office space', 'data centre', 'data center', 'industrial park', 'reit', 'flyover', 'road widening',
  'elevated corridor', 'underpass', 'ring road', 'orr', 'rrr', 'expressway', 'infrastructure project', 'sez',
  'tgiic', 'tsiic', 'real-estate', 'builder', 'developer', 'housing sales', 'affordable housing', 'rental housing',
];
export const WEAK_TERMS = ['airport', 'rgia', 'metro', 'highway', 'railway', 'mmts', 'nhai', 'ghmc', 'lake', 'water supply', 'drainage', 'corridor', 'repo rate', 'infrastructure', 'bridge', 'road'];
const DEVELOPMENT_CUE = /\b(project|construction|expansion|expand\w*|crore|tender|bids?|approv\w*|sanction\w*|launch\w*|phase|works?|plan\w*|dpr|extension|new (terminal|line|station|road)|widen\w*|land|acquisition|inaugurat\w*|foundation stone|budget|allocat\w*|policy|rules?|hike|cut|revis\w*|completion|deadline|alignment|lanes?)\b/i;
export const HARD_NOISE = [
  'shares', 'sensex', 'nifty', 'selloff', 'sell-off', 'stock market', 'market cap', 'm-cap', 'listed companies', 'ipo',
  'dining', 'restaurant', 'cuisine', 'menu', 'recipe', 'concert', 'festival', 'celebrity', 'actor', 'actress', 'film',
  'movie', 'box office', 'cricket', 'ipl', 'horoscope', 'fashion', 'detained', 'smuggl', 'gold seized', 'drugs',
  'ganja', 'murder', 'rape', 'suicide', 'stabbed', 'accident', 'killed', 'dies', 'died', 'passenger traffic', 'cab drivers',
  'halaman',
];

function termIn(t: string, term: string): boolean {
  return term.length <= 4 ? new RegExp(`\\b${term.replace(/[-]/g, '\\-')}\\b`, 'i').test(t) : t.includes(term);
}

export function isRelevant(text: string, excludeTerms: string[] = []): boolean {
  const t = text.toLowerCase();
  if (excludeTerms.some((x) => x && t.includes(x.toLowerCase()))) return false;
  if (HARD_NOISE.some((x) => termIn(t, x))) return false;
  if (STRONG_TERMS.some((x) => termIn(t, x))) return true;
  return WEAK_TERMS.some((x) => termIn(t, x)) && DEVELOPMENT_CUE.test(t);
}

/** Obvious SEO/aggregator spam that Google News sometimes surfaces. Admins can block more in NewsSource. */
export const DEFAULT_BLOCKED_PUBLISHERS = ['kompasiana.com', 'Kompasiana', 'HospiBuz', 'TradingView', 'Udayavani'];
