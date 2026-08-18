/**
 * String-similarity primitives for the resolver's composite scorer (spec 3.2,
 * Tier 4). Pure functions, no dependency — Jaro / Jaro-Winkler and a
 * fuzzywuzzy-style token-set ratio built on top of them.
 */

/** Jaro similarity in [0,1]. */
export function jaro(a: string, b: string): number {
  if (a === b) return a.length === 0 ? 0 : 1;
  const len1 = a.length;
  const len2 = b.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const aMatches = new Array<boolean>(len1).fill(false);
  const bMatches = new Array<boolean>(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  // Count transpositions.
  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < len1; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (
    (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3
  );
}

/**
 * Jaro-Winkler similarity in [0,1] — boosts strings sharing a common prefix
 * (up to 4 chars), which suits place-names where the head is most stable.
 */
export function jaroWinkler(a: string, b: string, prefixScale = 0.1): number {
  const j = jaro(a, b);
  let prefix = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * prefixScale * (1 - j);
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

/**
 * Token-set ratio (fuzzywuzzy structure, Jaro-Winkler as the base metric).
 * Handles multi-word names and word-order differences: it compares the shared
 * token core against each side's full token string and returns the best match.
 * For single-token names this reduces to jaroWinkler(a, b).
 */
export function tokenSetRatio(a: string, b: string): number {
  const ta = uniqueSorted(tokens(a));
  const tb = uniqueSorted(tokens(b));
  if (ta.length === 0 || tb.length === 0) return 0;

  const setA = new Set(ta);
  const setB = new Set(tb);
  const intersection = ta.filter((t) => setB.has(t));
  const diffAB = ta.filter((t) => !setB.has(t));
  const diffBA = tb.filter((t) => !setA.has(t));

  const sInter = intersection.join(' ');
  const sA = [...intersection, ...diffAB].join(' ');
  const sB = [...intersection, ...diffBA].join(' ');

  return Math.max(
    jaroWinkler(sInter, sA),
    jaroWinkler(sInter, sB),
    jaroWinkler(sA, sB),
  );
}
