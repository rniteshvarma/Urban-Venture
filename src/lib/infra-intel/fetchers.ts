/**
 * Fetchers: RSS / Google News RSS / generic HTML listing pages.
 *
 * Polite by construction: one request per source per run, an identifying
 * User-Agent, robots.txt honoured for HTML pages, 15 s timeout, no CAPTCHA
 * or paywall circumvention. Pages that need JavaScript or a login are out of
 * scope — they fail cleanly and show up as unhealthy in the admin.
 */

export const USER_AGENT = 'PropertyTigerBot/1.0 (+https://property-tiger.vercel.app/bot; infra research)';
const TIMEOUT_MS = 15000;

export interface FeedItem {
  title: string;
  url: string;
  summary: string | null;
  publisher: string | null;
  publishedAt: Date | null;
}

async function get(url: string, accept: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'en-IN,en;q=0.8' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return res.text();
}

// ── Text helpers ─────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—', hellip: '…', rdquo: '”', ldquo: '“' };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : null;
}

// ── RSS / Atom ───────────────────────────────────────────────────────────────

export function parseRss(xml: string): FeedItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const items: FeedItem[] = [];
  for (const b of blocks) {
    const rawTitle = tag(b, 'title');
    let link = tag(b, 'link');
    if (!link || !link.trim()) link = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? null;
    if (!rawTitle || !link) continue;
    const title = stripHtml(rawTitle);
    const url = stripHtml(link);
    const date = tag(b, 'pubDate') ?? tag(b, 'published') ?? tag(b, 'updated') ?? tag(b, 'dc:date');
    const desc = tag(b, 'description') ?? tag(b, 'summary') ?? tag(b, 'content');
    const publisher = tag(b, 'source');
    const parsed = date ? new Date(stripHtml(date)) : null;
    items.push({
      title,
      url,
      summary: desc ? stripHtml(desc).slice(0, 500) || null : null,
      publisher: publisher ? stripHtml(publisher) : null,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
    });
  }
  return items;
}

export async function fetchRss(url: string): Promise<FeedItem[]> {
  return parseRss(await get(url, 'application/rss+xml, application/atom+xml, application/xml, text/xml'));
}

// ── Google News RSS ──────────────────────────────────────────────────────────

export function googleNewsUrl(query: string, windowDays = 14): string {
  const q = `${query} when:${windowDays}d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

export async function fetchGoogleNews(query: string, windowDays = 14): Promise<FeedItem[]> {
  const items = parseRss(await get(googleNewsUrl(query, windowDays), 'application/rss+xml, application/xml'));
  // Google appends " - Publisher" to titles and puts the article list in the description.
  return items.map((it) => {
    const publisher = it.publisher;
    const title = publisher && it.title.endsWith(` - ${publisher}`) ? it.title.slice(0, -(publisher.length + 3)) : it.title;
    return { ...it, title, summary: null };
  });
}

// ── Generic HTML listing ─────────────────────────────────────────────────────

export function extractLinks(html: string, baseUrl: string): FeedItem[] {
  const out: FeedItem[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = stripHtml(m[2]);
    if (text.length < 20 || text.length > 300) continue;
    let url: string;
    try {
      url = new URL(decodeEntities(m[1]), baseUrl).toString();
    } catch {
      continue;
    }
    if (!/^https?:/i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: text, url, summary: null, publisher: new URL(baseUrl).hostname, publishedAt: null });
  }
  return out;
}

/** Minimal robots.txt check for `User-agent: *` and our bot name. Fails open only on fetch error. */
export async function robotsAllows(pageUrl: string): Promise<boolean> {
  const u = new URL(pageUrl);
  let body: string;
  try {
    body = await get(`${u.origin}/robots.txt`, 'text/plain');
  } catch {
    return true;
  }
  return robotsTxtAllows(body, u.pathname);
}

export function robotsTxtAllows(body: string, path: string): boolean {
  let applies = false;
  const disallows: string[] = [];
  const allows: string[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') applies = val === '*' || /propertytigerbot/i.test(val);
    else if (applies && key === 'disallow' && val) disallows.push(val);
    else if (applies && key === 'allow' && val) allows.push(val);
  }
  const longest = (rules: string[]) => rules.filter((r) => path.startsWith(r)).reduce((a, r) => Math.max(a, r.length), -1);
  return longest(allows) >= longest(disallows);
}

export async function fetchHtmlList(url: string, include?: string, exclude?: string): Promise<FeedItem[]> {
  if (!(await robotsAllows(url))) throw new Error('Disallowed by robots.txt');
  const html = await get(url, 'text/html,application/xhtml+xml');
  let links = extractLinks(html, url);
  if (include) {
    const re = new RegExp(include, 'i');
    links = links.filter((l) => re.test(l.title) || re.test(l.url));
  }
  if (exclude) {
    const re = new RegExp(exclude, 'i');
    links = links.filter((l) => !re.test(l.title) && !re.test(l.url));
  }
  return links;
}
