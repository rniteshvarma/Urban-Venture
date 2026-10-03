/**
 * Ranking for the homepage location suggestions. With nothing typed: the
 * localities with the most projects. While typing: names that start with the
 * text, then names with a word that starts with it, then names containing it,
 * then (from 3 letters) localities whose wider area matches ("HITEC" finds Kondapur).
 * Ties go to the location with more projects.
 */
export interface LocationSuggestion {
  name: string;
  /** the wider area a locality sits in; null when the suggestion is an area itself */
  area: string | null;
  count: number;
}

export function rankLocations(all: LocationSuggestion[], input: string, limit = 8): LocationSuggestion[] {
  const q = input.trim().toLowerCase();
  if (!q) return all.filter((s) => s.area !== null).sort((a, b) => b.count - a.count).slice(0, limit);
  const rankOf = (s: LocationSuggestion): number => {
    const name = s.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.split(/[\s/,-]+/).some((w) => w.startsWith(q))) return 1;
    if (name.includes(q)) return 2;
    // Matching the wider area is only useful once the text is specific enough.
    if (q.length >= 3 && s.area?.toLowerCase().includes(q)) return 3;
    return -1;
  };
  return all
    .map((s) => ({ s, rank: rankOf(s) }))
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || b.s.count - a.s.count)
    .slice(0, limit)
    .map((x) => x.s);
}
