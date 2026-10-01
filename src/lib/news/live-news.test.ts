import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRelevant } from './categories';
import { classifyCategory, classifySentiment, copiesSource, findAuthorities, impactScore, linkCorridors, rulesAnalysis } from './enrich';
import { feedsForCity, mentionsCity } from './providers/live';

const HYD = { slug: 'hyderabad', name: 'Hyderabad', stateCode: 'TG', queryTerms: ['HMDA', 'Kokapet', 'Regional Ring Road', 'TG RERA'] };

// ── Relevance ────────────────────────────────────────────────────────────────

test('relevance: property, infra development and rules are in', () => {
  assert.ok(isRelevant('TG RERA imposes Rs 32 lakh penalty on Janapriya Projects'));
  assert.ok(isRelevant('HMDA invites tenders for ₹1,656 crore elevated corridor'));
  assert.ok(isRelevant('RGIA expansion: new terminal gets ₹14,000 crore'));
  assert.ok(isRelevant('Telangana revises market value of land in 2026'));
});

test('relevance: mentions without development, markets, lifestyle and crime are out', () => {
  assert.ok(!isRelevant('Novotel Hyderabad Airport unveils Asian dining experience'));
  assert.ok(!isRelevant('Tata feud wipes ₹52,154 crore off listed companies’ market value'));
  assert.ok(!isRelevant('Telugu YouTuber detained at Hyderabad airport'));
  assert.ok(!isRelevant('Hyderabad metro ridership touches 5 lakh on Monday'));
  assert.ok(!isRelevant('Karachi airport expansion — Sindh CM', ['sindh', 'karachi']));
});

// ── Classification ───────────────────────────────────────────────────────────

test('category: rules, infra, legal, prices, macro', () => {
  assert.equal(classifyCategory('Telangana hikes stamp duty and registration charges from October'), 'POLICY_REGULATION');
  assert.equal(classifyCategory('Metro Phase 2 corridor to Future City gets DPR nod'), 'INFRASTRUCTURE');
  assert.equal(classifyCategory('HYDRAA demolishes illegal structures in lake buffer zone'), 'LEGAL_DISPUTES');
  assert.equal(classifyCategory('Hyderabad housing sales rise 12% as prices climb: Anarock'), 'MARKET_PRICES');
  assert.equal(classifyCategory('RBI holds repo rate; home loan EMIs unchanged'), 'MACRO_FINANCE');
  assert.equal(classifyCategory('Company market value falls after shares drop'), 'MARKET_PRICES'); // not "rules"
});

test('sentiment', () => {
  assert.equal(classifySentiment('Cabinet approves ₹5,000 crore Metro expansion'), 'POSITIVE');
  assert.equal(classifySentiment('RRR southern arc delayed again'), 'NEGATIVE');
  assert.equal(classifySentiment('Flyover opens but approach road work stalled'), 'MIXED');
  assert.equal(classifySentiment('HMDA to hold meeting on layouts'), 'NEUTRAL');
});

test('authorities: TG RERA supersedes generic RERA', () => {
  assert.deepEqual(findAuthorities('TG RERA fines builder; HMDA to review layout'), ['HMDA', 'TG RERA']);
});

test('impact rises with corridor, authority, GO and big money', () => {
  const low = impactScore({ category: 'PROJECT_LAUNCH', text: 'New villa project launched', corridors: 0, authorities: 0, goRef: false, projects: 0 });
  const high = impactScore({ category: 'INFRASTRUCTURE', text: 'Rs 12,000 crore RRR sanctioned', corridors: 1, authorities: 1, goRef: true, projects: 1 });
  assert.ok(high > low);
  assert.ok(high <= 10);
});

test('corridor linking by name and by nearby place', () => {
  const corridors = [
    { slug: 'kokapet-neopolis', shortName: 'Kokapet', name: 'Kokapet–Neopolis', centroidLat: 17.392, centroidLng: 78.335 },
    { slug: 'adibatla', shortName: 'Adibatla', name: 'Adibatla', centroidLat: 17.231, centroidLng: 78.553 },
  ];
  assert.deepEqual(linkCorridors('Kokapet land auction fetches record price', corridors), ['kokapet-neopolis']);
  assert.deepEqual(linkCorridors('Narsingi junction flyover works begin', corridors), ['kokapet-neopolis']); // ~2 km away
  assert.deepEqual(linkCorridors('Hyderabad property prices rise', corridors), []);
});

// ── Legal: originality guard ─────────────────────────────────────────────────

test('copiesSource flags 6+ word runs from the publisher, allows our own words', () => {
  const src = 'HMDA invites tenders for 1,656 crore Banjara Hills Gachibowli elevated corridor project';
  assert.ok(copiesSource('Update: HMDA invites tenders for 1,656 crore Banjara Hills road', src));
  assert.ok(!copiesSource('Tender stage for a west Hyderabad corridor; construction usually follows.', src));
});

test('rules commentary never copies the headline, for every category', () => {
  const headline = 'Telangana government sanctions Rs 500 crore for Shamshabad road widening and flyover works';
  for (const category of ['INFRASTRUCTURE', 'POLICY_REGULATION', 'LEGAL_DISPUTES', 'MARKET_PRICES', 'PROJECT_LAUNCH', 'INDUSTRIAL_JOBS', 'CIVIC_UTILITIES', 'MACRO_FINANCE'] as const) {
    const note = rulesAnalysis({ key: category, category, text: headline, cityName: 'Hyderabad', corridorNames: ['Tukkuguda'], authorities: ['HMDA'] });
    assert.ok(note.length > 20);
    assert.ok(!copiesSource(note, headline), `${category}: ${note}`);
  }
});

// ── Feeds ────────────────────────────────────────────────────────────────────

test('Hyderabad reads topic searches, its watch-list, local RSS and national feeds (city-filtered)', () => {
  const feeds = feedsForCity(HYD);
  assert.ok(feeds.some((f) => f.kind === 'gnews' && /rules/.test(f.label) && f.requireCityMention && /Telangana OR Hyderabad/.test(f.target)));
  assert.ok(feeds.some((f) => f.kind === 'rss' && f.label === 'The Hindu' && !f.requireCityMention));
  assert.ok(feeds.filter((f) => f.label === 'ETRealty').every((f) => f.requireCityMention));
  assert.ok(feeds.some((f) => f.target.includes('Kokapet')));
});

test('mentionsCity: city, state or signature single-word terms', () => {
  assert.ok(mentionsCity('HMDA approves layouts', HYD));
  assert.ok(mentionsCity('Telangana revises land values', HYD));
  assert.ok(!mentionsCity('Pune ring road land acquisition', HYD));
});

test('category: land compensation → rules; land disputes → legal', () => {
  assert.equal(classifyCategory('Land for canal: Farmers seek fair compensation'), 'POLICY_REGULATION');
  assert.equal(classifyCategory('NHRC seeks report from Telangana Govt on 22-A land disputes'), 'LEGAL_DISPUTES');
});

test('India-wide searches keep only items with an Indian reference', async () => {
  const { mentionsIndia } = await import('./providers/live');
  assert.ok(mentionsIndia('Pune Metro gets ₹180 crore for expansion'));
  assert.ok(!mentionsIndia('Harworth rejects Peel’s USD 802 million offer'));
});

// ── Story visual facts ───────────────────────────────────────────────────────

test('visual facts: key number, pins, stage — specific to the story', async () => {
  const { visualFacts } = await import('./visual-facts');
  const a = visualFacts({ headline: 'HMDA invites tenders for ₹1,656 crore Banjara Hills-Gachibowli elevated corridor', category: 'INFRASTRUCTURE', sentiment: 'NEUTRAL', authorities: ['HMDA'] });
  assert.deepEqual(a.fact, { value: '₹1,656 cr', label: 'Investment' });
  assert.deepEqual(a.pins.map((p) => p.name).sort(), ['Banjara Hills', 'Gachibowli']);
  assert.equal(a.stage?.steps[a.stage.current], 'Approved');

  const b = visualFacts({ headline: 'TG RERA slaps ₹32 lakh penalty on Janapriya Projects', category: 'POLICY_REGULATION', sentiment: 'NEGATIVE', authorities: ['TG RERA'] });
  assert.deepEqual(b.fact, { value: '₹32 lakh', label: 'Penalty' });
  assert.equal(b.tag, 'Rule change · TG RERA');

  const c = visualFacts({ headline: 'Warangal airport land handed over to AAI', category: 'INFRASTRUCTURE', sentiment: 'POSITIVE' });
  assert.equal(c.offMap?.name, 'Warangal');
  assert.equal(c.offMap?.direction, 'NE');

  const d = visualFacts({ headline: 'Pune Metro gets ₹180 crore for expansion', category: 'INFRASTRUCTURE', sentiment: 'POSITIVE' });
  assert.equal(d.otherCity, 'Pune');

  const e = visualFacts({ headline: "Specta Quartz strengthens focus on Hyderabad's luxury housing market", category: 'MARKET_PRICES', sentiment: 'NEUTRAL' });
  assert.equal(e.scope, 'CITY');

  const f = visualFacts({ headline: 'Centre puts RRR southern alignment on hold', category: 'INFRASTRUCTURE', sentiment: 'NEGATIVE' });
  assert.equal(f.stage?.flag, 'DELAYED');
});

test('category: land records → rules', () => {
  assert.equal(classifyCategory("Land records missing, Telangana's Erravalli farmers seek passbooks"), 'POLICY_REGULATION');
});

test('visual facts: other states, lakh shorthand, nationwide scope', async () => {
  const { visualFacts } = await import('./visual-facts');
  const up = visualFacts({ headline: 'UP RERA pays ₹73.84L interest to complainants', category: 'POLICY_REGULATION', sentiment: 'NEUTRAL' });
  assert.equal(up.otherCity, 'Uttar Pradesh');
  assert.equal(up.fact?.value, '₹73.84 lakh');
  const nat = visualFacts({ headline: 'India enters global top 30 in real estate transparency: JLL', category: 'MARKET_PRICES', sentiment: 'POSITIVE' });
  assert.equal(nat.scope, 'NATION');
  // "up" as an ordinary word must not be read as Uttar Pradesh
  assert.equal(visualFacts({ headline: 'Housing sales pick up in Q3', category: 'MARKET_PRICES', sentiment: 'POSITIVE' }).otherCity, null);
});
