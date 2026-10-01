/**
 * The source registry seed. Upserted by `npm run infra:seed`; admins can
 * pause/resume sources in /admin/infrastructure/updates, and trust is learned.
 *
 * Reachability audit (2026-09-22, from a non-Indian network):
 *   ✓ Google News RSS, The Hindu Hyderabad RSS, TOI Hyderabad RSS
 *   ✗ 403 to bots: Deccan Chronicle, NewsMeter, Hans India, PIB feeds → reached via Google News `site:` queries instead
 *   ✗ timeout: goir / HMDA / TGIIC / HMRL / telangana.gov.in — Indian government sites commonly drop
 *     non-Indian traffic. The crawler routes run in Vercel's Mumbai region (bom1, see vercel.json); these
 *     sources are seeded and health-tracked, and auto-pause after repeated failures.
 * Portals behind CAPTCHA or login (eProcurement, IGRS, PARIVESH search) are deliberately NOT crawled.
 */
export interface SourceSeed {
  key: string;
  name: string;
  kind: 'RSS' | 'GOOGLE_NEWS' | 'HTML_LIST' | 'AGENT';
  tier: 'OFFICIAL' | 'NEWS' | 'AGGREGATOR';
  url: string;
  cadenceHours: number;
  focus: 'HYDERABAD' | 'TELANGANA';
  config?: { query?: string; include?: string; exclude?: string; maxItems?: number; windowDays?: number };
}

const gn = (key: string, name: string, query: string, cadenceHours: number, tier: SourceSeed['tier'] = 'AGGREGATOR', focus: SourceSeed['focus'] = 'HYDERABAD'): SourceSeed => ({
  key,
  name,
  kind: 'GOOGLE_NEWS',
  tier,
  url: 'https://news.google.com/rss/search',
  cadenceHours,
  focus,
  config: { query, maxItems: 60, windowDays: cadenceHours <= 24 ? 7 : 14 },
});

export const SOURCE_SEEDS: SourceSeed[] = [
  // ── Hyderabad focus: roads (daily) ──
  gn('gn-hyd-roads', 'Hyderabad roads: flyovers, widening, elevated corridors', 'Hyderabad (flyover OR "road widening" OR "elevated corridor" OR underpass OR "link road" OR "road expansion" OR ROB OR RUB OR skyway)', 24),
  gn('gn-rrr', 'Regional Ring Road (RRR)', '"Regional Ring Road" Telangana', 24),
  gn('gn-orr-radial', 'ORR, radial and grid roads', 'Hyderabad ("Outer Ring Road" OR "radial road" OR "grid road" OR "missing link" OR "greenfield expressway")', 168),
  gn('gn-hmda-agencies', 'HMDA / HRDCL / GHMC / HMWSSB projects', '(HMDA OR HRDCL OR GHMC OR HMWSSB OR HGCL) project crore Hyderabad', 24),
  // ── Hyderabad focus: transit, airport, industry ──
  gn('gn-metro', 'Hyderabad Metro phases & extensions', 'Hyderabad Metro (phase OR extension OR corridor OR "Future City" OR airport) -review', 24),
  gn('gn-rail', 'MMTS / railway stations / new lines', 'Hyderabad (MMTS OR Cherlapally OR "railway station" OR "railway line" OR "rail over bridge") Telangana', 168),
  gn('gn-airport', 'RGIA / airports / aviation', 'Hyderabad airport (expansion OR cargo OR terminal OR MRO OR aerospace) RGIA', 168),
  gn('gn-future-city', 'Future City / Pharma City / FCDA', '("Future City" OR "Fourth City" OR "Pharma City" OR FCDA) Telangana', 24),
  gn('gn-industrial', 'Industrial, IT & logistics parks', 'Telangana (TGIIC OR "industrial park" OR "IT park" OR "data centre" OR "logistics park" OR SEZ) crore', 168),
  gn('gn-musi-water', 'Musi riverfront & water/sewage works', 'Hyderabad ("Musi riverfront" OR "Godavari water" OR "drinking water project" OR reservoir OR "sewage treatment")', 168),
  // ── Statewide ──
  gn('gn-nh', 'National highways in Telangana', 'Telangana (NHAI OR "national highway" OR Bharatmala OR "four-lane" OR "greenfield highway")', 168, 'AGGREGATOR', 'TELANGANA'),
  gn('gn-state-sanctions', 'State sanctions & GOs for infra', 'Telangana government sanctions crore (road OR bridge OR flyover OR project) G.O.', 168, 'AGGREGATOR', 'TELANGANA'),
  // ── Publishers that block bots, reached via Google News site: search ──
  gn('gn-pib', 'PIB (Govt of India) — Telangana infra', 'site:pib.gov.in Telangana (highway OR railway OR airport OR NHAI)', 168, 'OFFICIAL', 'TELANGANA'),
  gn('gn-telangana-today', 'Telangana Today — infra', 'site:telanganatoday.com (flyover OR road OR metro OR RRR OR project OR HMDA)', 24, 'NEWS'),
  gn('gn-deccan-chronicle', 'Deccan Chronicle — Hyderabad infra', 'site:deccanchronicle.com Hyderabad (flyover OR road OR metro OR corridor OR HMDA)', 168, 'NEWS'),
  gn('gn-hans', 'Hans India — Hyderabad infra', 'site:thehansindia.com Hyderabad (flyover OR "road widening" OR metro OR corridor)', 168, 'NEWS'),
  // ── Direct RSS (verified reachable) ──
  { key: 'rss-hindu-hyd', name: 'The Hindu — Hyderabad', kind: 'RSS', tier: 'NEWS', url: 'https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss', cadenceHours: 24, focus: 'HYDERABAD' },
  { key: 'rss-toi-hyd', name: 'Times of India — Hyderabad', kind: 'RSS', tier: 'NEWS', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128816011.cms', cadenceHours: 24, focus: 'HYDERABAD' },
  // ── Official sites (need an Indian egress IP; health-tracked) ──
  { key: 'html-hmda', name: 'HMDA — notices & news', kind: 'HTML_LIST', tier: 'OFFICIAL', url: 'https://www.hmda.gov.in/', cadenceHours: 168, focus: 'HYDERABAD', config: { include: 'tender|notification|project|road|layout|master plan|corridor|flyover' } },
  { key: 'html-hmrl', name: 'Hyderabad Metro Rail — news', kind: 'HTML_LIST', tier: 'OFFICIAL', url: 'https://www.hmrl.co.in/', cadenceHours: 168, focus: 'HYDERABAD', config: { include: 'metro|phase|corridor|tender|station' } },
  { key: 'html-tgiic', name: 'TGIIC — industrial parks', kind: 'HTML_LIST', tier: 'OFFICIAL', url: 'https://tgiic.telangana.gov.in/', cadenceHours: 168, focus: 'TELANGANA', config: { include: 'park|tender|industrial|cluster|allot' } },
  { key: 'html-goir', name: 'Telangana GO portal', kind: 'HTML_LIST', tier: 'OFFICIAL', url: 'https://goir.telangana.gov.in/', cadenceHours: 168, focus: 'TELANGANA', config: { include: 'G\\.?O|road|works|sanction|administrative' } },
  // ── Claude web-search status check of the projects we already track ──
  { key: 'agent-status', name: 'AI status check of tracked projects (web search)', kind: 'AGENT', tier: 'AGGREGATOR', url: 'claude://web_search', cadenceHours: 168, focus: 'HYDERABAD' },
];

/** Tier prior for new sources (matches TRUST_PRIOR means). */
export const TIER_TRUST: Record<SourceSeed['tier'], number> = { OFFICIAL: 0.8, NEWS: 0.6, AGGREGATOR: 0.5 };
