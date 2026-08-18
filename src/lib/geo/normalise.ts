/**
 * Village-name normalisation, phonetic keying, and Telugu transliteration.
 *
 * Pure functions — no DB, no I/O. This is the matching substrate the resolver
 * (lib/geo/resolver.ts) builds on: every RevenueVillage stores the outputs of
 * these functions (nameNormalised, namePhonetic, nameTranslit) so that a raw
 * source name can be reduced the same way and compared.
 *
 * See AGENTS.md geo spec, Part 3.1.
 */

import { doubleMetaphone } from 'double-metaphone';
import Sanscript from '@indic-transliteration/sanscript';

/** Administrative markers that appear as parenthetical tags, e.g. "Kadthal (V)". */
const ADMIN_PAREN_MARKERS = new Set([
  'v', 'm', 'ct', 'og', 'gp', 'r', 'u', 'rural', 'urban', 'municipality', 'corp',
]);

/** Standalone admin words to strip from anywhere in the name. Order: longest first. */
const ADMIN_WORDS = [
  'revenue village',
  'gram panchayat',
  'village',
  'grama',
  'gram',
];

/**
 * Telugu-romanisation substitutions, applied in order. Digraphs and longer
 * sequences MUST come before the shorter forms they contain (e.g. 'ksh' before
 * 'sh' and 'kh'). Each entry is [pattern, replacement] on the whole string.
 */
const SUBSTITUTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // multi-char clusters first
  [/ksh/g, 'ks'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/bh/g, 'b'],
  [/gh/g, 'g'],
  [/kh/g, 'k'],
  [/ph/g, 'f'],
  [/sh/g, 's'],
  // doubled vowels
  [/oo/g, 'u'],
  [/ee/g, 'i'],
  [/aa/g, 'a'],
  [/ai/g, 'ay'],
  // single-char consonant swaps
  [/w/g, 'v'],
  [/z/g, 'j'],
];

/**
 * Suffix equivalence classes — collapse each variant to one canonical spelling.
 * Applied after SUBSTITUTIONS, as end-of-string replacements. The keys are
 * post-substitution forms (e.g. 'wada' has already become 'vada').
 */
const SUFFIX_CANON: ReadonlyArray<readonly [RegExp, string]> = [
  [/(palle|pally)$/g, 'palli'],
  [/gudem$/g, 'guda'],
  [/puram$/g, 'pur'],
  [/charla$/g, 'cherla'],
  [/kunda$/g, 'konda'],
];

export interface NormalisedName {
  /** Canonical form: substitutions applied, trailing 'a' removed. Primary match key. */
  canonical: string;
  /** Same as canonical but preserving a trailing 'a' (Telugu names optionally drop it). */
  canonicalWithA: string;
  /** Parenthetical disambiguator, normalised — e.g. "Rampur (Kothur)" -> "kothur". */
  qualifier: string | null;
}

/** Lowercase, trim, collapse internal whitespace. */
function basicClean(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** NFD-normalise and strip combining diacritical marks. */
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Pull out parenthetical content. Admin markers ((V), (M), ...) are discarded;
 * the first non-admin parenthetical is returned as the qualifier. Returns the
 * name with all parentheticals removed plus the extracted qualifier.
 */
function extractParentheticals(s: string): { stripped: string; qualifier: string | null } {
  let qualifier: string | null = null;
  const stripped = s
    .replace(/\(([^)]*)\)/g, (_m, inner: string) => {
      const token = inner.trim().toLowerCase();
      if (token && !ADMIN_PAREN_MARKERS.has(token) && qualifier === null) {
        qualifier = token;
      }
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { stripped, qualifier };
}

/** Remove standalone admin words (village, gram, ...) as whole words. */
function stripAdminWords(s: string): string {
  let out = s;
  for (const word of ADMIN_WORDS) {
    out = out.replace(new RegExp(`\\b${word}\\b`, 'g'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Normalise punctuation: token separators (hyphen, slash, underscore) become
 * spaces so "Rampur-Khurd" splits into two tokens, while joiners (apostrophe,
 * dot) are removed so "K'adthal." collapses to one. Anything else non-alphanumeric
 * is dropped.
 */
function stripPunctuation(s: string): string {
  return s
    .replace(/[/\-_]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Apply the Telugu-romanisation substitution rules and suffix canonicalisation. */
function applySubstitutions(s: string): string {
  let out = s;
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of SUFFIX_CANON) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Reduce a raw place-name to its canonical matching form.
 *
 * Pipeline (order matters — see spec Part 3.1):
 *   1. lowercase / trim / collapse whitespace
 *   2. extract parenthetical qualifier, drop admin markers
 *   3. strip admin words (village, gram, ...)
 *   4. NFD + strip diacritics + strip punctuation
 *   5. Telugu-romanisation substitutions + suffix equivalence classes
 *   6. optional trailing 'a' (both forms returned)
 */
export function normalise(raw: string): NormalisedName {
  const cleaned = basicClean(raw);
  const { stripped, qualifier } = extractParentheticals(cleaned);
  const noAdmin = stripAdminWords(stripped);
  const noDiacritics = stripDiacritics(noAdmin);
  const noPunct = stripPunctuation(noDiacritics);
  const substituted = applySubstitutions(noPunct);

  const canonicalWithA = substituted.trim();
  // Only drop a trailing 'a' when it leaves a non-empty stem.
  const canonical =
    canonicalWithA.length > 1 && canonicalWithA.endsWith('a')
      ? canonicalWithA.slice(0, -1)
      : canonicalWithA;

  return {
    canonical,
    canonicalWithA,
    qualifier: qualifier
      ? applySubstitutions(stripPunctuation(stripDiacritics(qualifier))) || null
      : null,
  };
}

/**
 * Convenience wrapper matching the spec's documented signature — returns just
 * the canonical string.
 */
export function normaliseVillageName(raw: string): string {
  return normalise(raw).canonical;
}

/**
 * Double Metaphone primary key for a (already normalised) name. Falls back to
 * the raw string if callers pass an un-normalised value; callers should pass
 * `normalise(raw).canonical`.
 */
export function phoneticKey(normalised: string): string {
  if (!normalised) return '';
  const [primary] = doubleMetaphone(normalised);
  return primary;
}

/**
 * Secondary Double Metaphone key (the alternate pronunciation). Empty string
 * when it matches the primary — callers index it only when it differs.
 */
export function phoneticKeyAlternate(normalised: string): string {
  if (!normalised) return '';
  const [primary, alternate] = doubleMetaphone(normalised);
  return alternate && alternate !== primary ? alternate : '';
}

/** Telugu script -> ITRANS romanisation (lowercased). Safe on non-Telugu input. */
export function teluguToItrans(telugu: string): string {
  if (!telugu || !telugu.trim()) return '';
  return (Sanscript as { t: (s: string, from: string, to: string) => string })
    .t(telugu, 'telugu', 'itrans')
    .toLowerCase();
}

/**
 * Telugu script -> phonetic key. Converts Telugu -> ITRANS, runs it through the
 * same normalisation substitutions, and returns the Double Metaphone key. This
 * lets a Telugu-script gazette entry match an English-spelled LGD record.
 */
export function transliterateKey(telugu: string): string {
  if (!telugu || !telugu.trim()) return '';
  const canonical = normalise(teluguToItrans(telugu)).canonical;
  return phoneticKey(canonical);
}
