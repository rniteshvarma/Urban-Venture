/**
 * Fuzzy dedupe key (News module spec, Part 4 stage 2). The same wire story runs
 * across many outlets with slightly different headlines; `dedupeHash` normalises
 * a headline (lowercase, strip stopwords, sort remaining tokens, hash) so those
 * collapse to one, independent of word order or trivial edits.
 */

import { createHash } from 'node:crypto';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'at', 'by',
  'with', 'from', 'as', 'is', 'are', 'be', 'will', 'over', 'after', 'across',
  'new', 'set', 'says', 'amid', 'near', 'into', 'up', 'its',
]);

export function dedupeHash(headline: string): string {
  const tokens = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .sort();
  return createHash('sha256').update(tokens.join(' ')).digest('hex').slice(0, 16);
}

/** Deterministic visual seed for an article id (spec Part 5). */
export function visualSeed(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 12);
}
