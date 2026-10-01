/**
 * Match an extracted fact to an existing InfraProject.
 *
 * Signals: acronym/alias hit in the text ("RRR", "Pharma City"), token overlap
 * between the extracted name and the project name (Jaro-Winkler token-set, the
 * same metric the geo resolver uses), and a directional qualifier check so
 * "RRR southern arc" does not update the northern arc.
 */
import { jaroWinkler, tokenSetRatio } from '../geo/similarity';

export interface MatchableProject {
  id: string;
  name: string;
  shortName: string;
  tags?: string[];
}

export interface MatchResult {
  projectId: string | null;
  score: number;
}

const STOP = new Set(['the', 'of', 'and', 'to', 'project', 'phase', 'road', 'hyderabad', 'telangana', 'development', 'infrastructure', 'new']);
const DIRECTIONS = ['northern', 'southern', 'eastern', 'western', 'north', 'south', 'east', 'west'];

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentTokens(s: string): string[] {
  return norm(s)
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Acronyms in parentheses, e.g. "Regional Ring Road (RRR) - Northern Arc" → ["rrr"]. */
function acronyms(name: string): string[] {
  return [...name.matchAll(/\(([A-Za-z0-9]{2,6})\)/g)].map((m) => m[1].toLowerCase());
}

function wordIn(text: string, word: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text);
}

function directionOf(s: string): string | null {
  const n = norm(s);
  for (const d of DIRECTIONS) if (wordIn(n, d)) return d.replace(/ern$/, '');
  return null;
}

/** Words that describe *what kind* of thing a project is, not *which* one. */
const GENERIC = new Set([
  'metro', 'rail', 'flyover', 'corridor', 'elevated', 'ring', 'city', 'hubs', 'hub', 'arc', 'link', 'expressway', 'highway',
  'riverfront', 'park', 'phase', 'infra', 'works', 'line', 'extension', 'airport', 'station',
  '1', '2', '3', '2a', '2b', 'i', 'ii', 'iii', 'from', 'digitization', 'interchange', 'exit', 'widening',
]);

/**
 * 0-1 confidence that `fullText` is about `project`.
 * A project is only matched when at least one DISTINCTIVE token of its name
 * (a place, a proper noun) or its parenthesised acronym appears in the text —
 * "Hyderabad" + "metro" alone must never match "Metro Phase 2B (Nagole to RGIA)".
 */
export function scoreProject(project: MatchableProject, extractedName: string, fullText: string): number {
  const text = norm(`${extractedName} ${fullText}`);
  const tokens = [...new Set([...contentTokens(project.name), ...contentTokens(project.shortName)])];
  const distinctive = tokens.filter((t) => !GENERIC.has(t));
  const generic = tokens.filter((t) => GENERIC.has(t));
  const dHit = distinctive.filter((t) => wordIn(text, t)).length;
  const gHit = generic.filter((t) => wordIn(text, t)).length;

  let score: number;
  if (distinctive.length === 0) {
    // All-generic name ("Metro Phase 2"): never enough on its own.
    score = 0.3 * (generic.length ? gHit / generic.length : 0);
  } else if (dHit === 0) {
    score = 0.3 * (generic.length ? gHit / generic.length : 0);
  } else {
    const dShare = distinctive.length ? dHit / distinctive.length : 0;
    const gShare = generic.length ? gHit / generic.length : 0;
    score = 0.55 + 0.3 * dShare + 0.15 * gShare;
  }

  const acr = acronyms(project.name);
  if (acr.some((a) => a.length >= 3 && wordIn(text, a))) score = Math.max(score, 0.88);
  for (const tag of project.tags ?? []) {
    const t = tag.toLowerCase();
    if (t.length >= 4 && acr.includes(t) && wordIn(text, t)) score = Math.max(score, 0.88);
  }

  // Directional qualifiers must agree when both sides have one.
  const pd = directionOf(project.name);
  const td = directionOf(fullText);
  if (pd && td && pd !== td) score *= 0.6;
  else if (pd && !td) score *= 0.9; // which arc? keep ambiguous hits below the match bar

  // The extracted name IS the project name (modulo punctuation) — whole-string, not subset.
  if (score < 0.55 && jaroWinkler(norm(extractedName), norm(project.name)) > 0.97) score = 0.8;

  return Math.max(0, Math.min(1, score));
}

export function matchProject(projects: MatchableProject[], extractedName: string, fullText: string): MatchResult {
  let best: MatchResult = { projectId: null, score: 0 };
  for (const p of projects) {
    const s = scoreProject(p, extractedName, fullText);
    if (s > best.score) best = { projectId: p.id, score: Math.round(s * 1000) / 1000 };
  }
  return best;
}

/**
 * Do two extracted names describe the same (new) project? Overlap of their
 * distinctive tokens: "Banjara Hills–Gachibowli elevated corridor" ≈
 * "HMDA invites bids for Banjara Hills corridor".
 */
export function sameProjectName(a: string, b: string): boolean {
  if (tokenSetRatio(norm(a), norm(b)) >= 0.93) return true;
  const noise = new Set(['hmda', 'ghmc', 'hrdcl', 'invites', 'bids', 'tender', 'tenders', 'announces', 'plans', 'crore', 'rs', 'cr', 'approves', 'develop', 'to', 'for', 'in', 'major', 'govt', 'government']);
  const ta = new Set(contentTokens(a).filter((t) => !GENERIC.has(t) && !noise.has(t) && !/^\d/.test(t)));
  const tb = new Set(contentTokens(b).filter((t) => !GENERIC.has(t) && !noise.has(t) && !/^\d/.test(t)));
  if (ta.size === 0 || tb.size === 0) return false;
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared >= 2 && shared / Math.min(ta.size, tb.size) >= 0.66;
}
