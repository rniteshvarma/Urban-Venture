import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyZone, findPlaces, resolvePlaces, mentionsOutOfState } from './geo';
import { classifyEvent, extractCompletionPct, extractCrore, extractProjectName, extractTargetDate, isRelevant, rulesExtract } from './text';
import { computeTrust, decide, defaultThreshold, nextThreshold, type DecisionInput } from './policy';
import { computeImpact, corridorInfraScore, yearsToCompletion, type ProjectForScoring } from './scoring';
import { matchProject, sameProjectName } from './match';
import { parseRss, robotsTxtAllows, extractLinks } from './fetchers';
import { planChanges } from './apply';

// ── Geography ────────────────────────────────────────────────────────────────

test('zones: city core inside RRR, Toopran-belt buffer, Warangal statewide, Bengaluru outside', () => {
  assert.equal(classifyZone(17.385, 78.4867), 'INSIDE_RRR'); // Hyderabad centre
  assert.equal(classifyZone(17.2403, 78.4294), 'INSIDE_RRR'); // RGIA
  assert.equal(classifyZone(18.0, 78.5), 'RRR_BUFFER'); // ~17 km north of the Toopran arc
  assert.equal(classifyZone(17.9689, 79.5941), 'TELANGANA'); // Warangal
  assert.equal(classifyZone(12.97, 77.59), 'OUTSIDE'); // Bengaluru
});

test('gazetteer: longer match wins — "Nalgonda X Roads" is Malakpet, not Nalgonda town', () => {
  const names = findPlaces('Nalgonda X Roads flyover to open today').map((p) => p.name);
  assert.deepEqual(names, ['Malakpet']);
  assert.equal(resolvePlaces('Nalgonda X Roads flyover').zone, 'INSIDE_RRR');
});

test('gazetteer: "Telangana" alone is statewide, not Hyderabad', () => {
  assert.equal(resolvePlaces('Telangana approves new reservoir').zone, 'TELANGANA');
  assert.equal(resolvePlaces('Uppal–Narapally flyover in Telangana').zone, 'INSIDE_RRR');
});

test('out-of-state detection', () => {
  assert.ok(mentionsOutOfState('Avisirah to develop AI data centre in Navi Mumbai'));
  assert.ok(!mentionsOutOfState('HMDA calls bids for elevated corridor'));
});

// ── Text rules ───────────────────────────────────────────────────────────────

test('relevance: infra yes, crashes and crime no', () => {
  assert.ok(isRelevant('HMDA calls bids for 8.75 km elevated corridor between Banjara Hills and Gachibowli'));
  assert.ok(!isRelevant('Doctor burnt alive after car hits divider on Hyderabad-Khammam highway'));
  assert.ok(!isRelevant('CBI books NHAI Warangal project director for disproportionate assets'));
  assert.ok(!isRelevant('Hyderabad weather: light rain likely'));
});

test('events: tender, delay, completion, progress, on-hold', () => {
  assert.deepEqual(classifyEvent('HMDA invites tenders for ₹1,656 crore corridor'), { event: 'TENDER', status: 'APPROVED' });
  assert.deepEqual(classifyEvent('Centre puts RRR southern alignment on hold'), { event: 'DELAY', status: 'DELAYED' });
  assert.deepEqual(classifyEvent('Nalgonda X Roads flyover to open today'), { event: 'COMPLETION', status: 'COMPLETE' });
  assert.deepEqual(classifyEvent('First stretch of the elevated corridor inaugurated'), { event: 'COMPLETION', status: 'PARTIALLY_COMPLETE' });
  assert.deepEqual(classifyEvent('Uppal Junction flyover makes 30.8% progress'), { event: 'PROGRESS_UPDATE', status: 'UNDER_CONSTRUCTION' });
  assert.equal(classifyEvent('KBR Park corridor scrapped').status, 'CANCELLED');
});

test('numbers: crore incl. lakh crore, %, target date', () => {
  assert.equal(extractCrore('HMDA invites tenders for ₹1,656 crore project'), 1656);
  assert.equal(extractCrore('a Rs 1.2 lakh crore investment'), 120000);
  assert.equal(extractCompletionPct('works 75 per cent complete'), 75);
  assert.equal(extractCompletionPct('flyover makes 30.8% progress'), 31);
  assert.equal(extractTargetDate('Uppal-Narapally flyover to be completed by June 2027'), 'Jun 2027');
});

test('project names from headlines', () => {
  assert.equal(extractProjectName('HMDA calls bids for 8.75 km elevated corridor between Banjara Hills and Gachibowli'), 'Banjara Hills–Gachibowli elevated corridor');
  assert.equal(extractProjectName('Uppal-Narapally flyover to be completed by June 2027'), 'Uppal-Narapally flyover');
  assert.equal(extractProjectName('HMDA Invites Tenders for ₹1,656 Crore Banjara Hills-Gachibowli Elevated Corridor'), 'Banjara Hills-Gachibowli Elevated Corridor');
  assert.equal(extractProjectName('Centre puts RRR on hold'), 'Regional Ring Road (RRR)');
});

test('rules extractor never claims high confidence', () => {
  const f = rulesExtract('G.O.Ms.No. 68 sanctions Rs 500 crore for Shamshabad road widening', '', ['Shamshabad']);
  assert.ok(f);
  assert.ok(f.confidence <= 75);
  assert.equal(f.goRef?.startsWith('G.O.Ms.No. 68'), true);
});

// ── Matching ─────────────────────────────────────────────────────────────────

const PROJECTS = [
  { id: 'rrrN', name: 'Regional Ring Road (RRR) - Northern Arc', shortName: 'RRR North' },
  { id: 'rrrS', name: 'Regional Ring Road (RRR) - Southern Arc', shortName: 'RRR South' },
  { id: 'm2b', name: 'Hyderabad Metro Phase 2B (Nagole to RGIA)', shortName: 'Metro 2B' },
  { id: 'mmts', name: 'Vande Bharat / MMTS Phase 2 Hubs', shortName: 'MMTS Phase 2' },
];

test('matching: acronym + direction pick the right arc', () => {
  assert.equal(matchProject(PROJECTS, 'Regional Ring Road', 'Centre puts RRR southern alignment on hold').projectId, 'rrrS');
  const n = matchProject(PROJECTS, 'RRR', 'RRR northern arc land acquisition 90% complete');
  assert.equal(n.projectId, 'rrrN');
  assert.ok(n.score >= 0.75);
});

test('matching: "Hyderabad" + "metro"/"flyover" alone never matches a specific project', () => {
  assert.ok(matchProject(PROJECTS, 'KBR Park flyover', 'KBR Park flyover plan in Hyderabad cut to one corridor').score < 0.5);
  assert.ok(matchProject(PROJECTS, 'Hyderabad Metro', 'Hyderabad Metro ridership crosses 5 lakh').score < 0.5);
  assert.ok(matchProject(PROJECTS, 'Metro to airport', 'Nagole to airport metro extension DPR approved').score >= 0.75);
});

test('same new project across publishers', () => {
  assert.ok(sameProjectName('Banjara Hills-Gachibowli Elevated Corridor', 'HMDA invites bids for Banjara Hills corridor'));
  assert.ok(!sameProjectName('Uppal-Narapally flyover', 'Paradise-Shamirpet elevated corridor'));
});

// ── Policy & learning ────────────────────────────────────────────────────────

const base: DecisionInput = {
  eventType: 'STATUS_CHANGE',
  tier: 'OFFICIAL',
  confidence: 90,
  sourceTrust: 0.8,
  isNewProject: false,
  matchScore: 0.9,
  corroboration: 1,
  hasDelta: true,
  statusRegression: false,
  proposedStatus: 'UNDER_CONSTRUCTION',
  zone: 'INSIDE_RRR',
  threshold: defaultThreshold('STATUS_CHANGE', 'OFFICIAL'),
};

test('policy: confident official status change auto-applies', () => {
  assert.equal(decide(base).decision, 'AUTO_APPLIED');
});

test('policy: hard guards always queue', () => {
  assert.equal(decide({ ...base, proposedStatus: 'CANCELLED' }).decision, 'QUEUED');
  assert.equal(decide({ ...base, eventType: 'DELAY', proposedStatus: 'DELAYED' }).decision, 'QUEUED');
  assert.equal(decide({ ...base, statusRegression: true }).decision, 'QUEUED');
  assert.equal(decide({ ...base, matchScore: 0.6 }).decision, 'QUEUED');
  assert.equal(decide({ ...base, isNewProject: true, tier: 'AGGREGATOR', eventType: 'NEW_PROJECT', corroboration: 1 }).decision, 'QUEUED');
});

test('policy: nothing to change or out of state → ignored', () => {
  assert.equal(decide({ ...base, hasDelta: false }).decision, 'IGNORED');
  assert.equal(decide({ ...base, zone: 'OUTSIDE' }).decision, 'IGNORED');
});

test('policy: corroboration can lift a borderline signal over the line', () => {
  const t = defaultThreshold('STATUS_CHANGE', 'NEWS');
  const x = { ...base, tier: 'NEWS' as const, sourceTrust: 0.6, confidence: 75, threshold: t };
  assert.equal(decide(x).decision, 'QUEUED');
  assert.equal(decide({ ...x, corroboration: 3 }).decision, 'AUTO_APPLIED');
});

test('learning: reverts raise the threshold, near-line approvals lower it, clamped', () => {
  assert.equal(nextThreshold(0.6, 'REVERTED', 0.7, 0.6), 0.65);
  assert.equal(nextThreshold(0.6, 'APPROVED', 0.55, 0.6), 0.585);
  assert.equal(nextThreshold(0.6, 'APPROVED', 0.3, 0.6), 0.6); // far below the line: no signal about the threshold
  assert.equal(nextThreshold(0.94, 'REVERTED', 0.99, 0.94), 0.95);
});

test('learning: trust falls with reverts, rises with approvals', () => {
  const prior = computeTrust('NEWS', { approved: 0, implicitOk: 0, rejected: 0, reverted: 0 });
  assert.equal(prior, 0.6);
  assert.ok(computeTrust('NEWS', { approved: 10, implicitOk: 0, rejected: 0, reverted: 0 }) > prior);
  assert.ok(computeTrust('NEWS', { approved: 0, implicitOk: 0, rejected: 0, reverted: 3 }) < 0.45);
});

// ── Scoring ──────────────────────────────────────────────────────────────────

const proj = (over: Partial<ProjectForScoring> = {}): ProjectForScoring => ({
  id: 'p',
  name: 'P',
  status: 'UNDER_CONSTRUCTION',
  category: 'ROAD_HIGHWAY',
  impact: 8,
  impactRadiusKm: 10,
  estimatedCompletion: 'Q4 2027',
  latitude: 17.2,
  longitude: 78.48,
  listedForCorridor: false,
  statusUpgrades90d: 0,
  lastVerifiedAt: new Date('2026-09-01'),
  ...over,
});
const NOW = new Date('2026-09-22');
const C = { lat: 17.2, lng: 78.48 };

test('scoring: no saturation — a fourth strong project still adds points', () => {
  const three = corridorInfraScore([proj({ id: 'a' }), proj({ id: 'b' }), proj({ id: 'c' })], C, NOW).infraScore;
  const four = corridorInfraScore([proj({ id: 'a' }), proj({ id: 'b' }), proj({ id: 'c' }), proj({ id: 'd' })], C, NOW).infraScore;
  assert.ok(four > three, `${four} > ${three}`);
  assert.ok(four < 25);
});

test('scoring: distance, stage, momentum and staleness all move the score', () => {
  const s = (p: ProjectForScoring) => corridorInfraScore([p], C, NOW).raw;
  assert.ok(s(proj()) > s(proj({ latitude: 17.4 })), 'nearer beats farther');
  assert.ok(s(proj()) > s(proj({ status: 'ANNOUNCED', estimatedCompletion: 'FY 2034-35' })), 'building beats announced');
  assert.ok(s(proj({ statusUpgrades90d: 1 })) > s(proj()), 'recent upgrade adds momentum');
  assert.ok(s(proj({ lastVerifiedAt: new Date('2025-06-01') })) < s(proj()), 'stale data discounts');
});

test('scoring: road polyline distance uses the nearest point on the route', () => {
  const road = proj({ latitude: 18.5, longitude: 79.5, route: [[17.2, 78.3], [17.2, 78.7]] });
  const r = corridorInfraScore([road], C, NOW);
  assert.equal(r.drivers[0].distanceKm, 0);
});

test('impact & time helpers', () => {
  assert.equal(computeImpact({ category: 'METRO_RAIL', totalInvestmentCr: 24000 }), 10);
  assert.equal(computeImpact({ category: 'ROAD_HIGHWAY', totalInvestmentCr: 37 }), 4);
  assert.equal(yearsToCompletion('Completed Q1 2026', 'PARTIALLY_COMPLETE', NOW), 0);
  assert.ok(Math.abs(yearsToCompletion('FY 2028-29', 'APPROVED', NOW) - 2.52) < 0.05);
});

// ── Apply planning ───────────────────────────────────────────────────────────

const state = { id: 'x', status: 'APPROVED', completionPct: 0, totalInvestmentCr: null, totalLengthKm: null, estimatedCompletion: 'FY 2028-29', sourceGO: null };
const fact = (over: Partial<ReturnType<typeof rulesExtract> & object> = {}) => ({
  projectName: 'X',
  eventType: 'STATUS_CHANGE' as const,
  proposedStatus: 'UNDER_CONSTRUCTION' as const,
  category: null,
  completionPct: null,
  investmentCr: null,
  lengthKm: null,
  goRef: null,
  targetCompletion: null,
  places: [],
  summary: 'Works began',
  confidence: 80,
  ...over,
});

test('apply: status only moves forward; backwards is flagged, not written', () => {
  const fwd = planChanges(state, fact(), 'h', false);
  assert.equal(fwd.update.status, 'UNDER_CONSTRUCTION');
  const back = planChanges({ ...state, status: 'UNDER_CONSTRUCTION' }, fact({ proposedStatus: 'ANNOUNCED' }), 'h', false);
  assert.equal(back.statusRegression, true);
  assert.equal(back.update.status, undefined);
});

test('apply: progress % lifts stage; numbers fill only when missing; target-date-only is not a delta', () => {
  const p = planChanges(state, fact({ proposedStatus: null, eventType: 'PROGRESS_UPDATE', completionPct: 40, investmentCr: 900 }), 'h', false);
  assert.equal(p.update.completionPct, 40);
  assert.equal(p.update.status, 'UNDER_CONSTRUCTION');
  assert.equal(p.update.totalInvestmentCr, 900);
  const onlyDate = planChanges(state, fact({ proposedStatus: 'APPROVED', eventType: 'OTHER', targetCompletion: 'Jun 2029' }), 'h', false);
  assert.equal(onlyDate.hasDelta, false);
});

// ── Fetchers ─────────────────────────────────────────────────────────────────

test('RSS parsing: CDATA, entities, source, date', () => {
  const xml = `<rss><channel><item><title><![CDATA[Uppal flyover &amp; corridor]]></title><link>https://x.test/a</link>
    <pubDate>Mon, 21 Sep 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Works resume&lt;/p&gt;</description><source url="https://th.test">The Hindu</source></item></channel></rss>`;
  const [it] = parseRss(xml);
  assert.equal(it.title, 'Uppal flyover & corridor');
  assert.equal(it.url, 'https://x.test/a');
  assert.equal(it.summary, 'Works resume');
  assert.equal(it.publisher, 'The Hindu');
  assert.equal(it.publishedAt?.toISOString(), '2026-09-21T10:00:00.000Z');
});

test('robots.txt: longest rule wins; other bots ignored', () => {
  const body = 'User-agent: *\nDisallow: /admin\nAllow: /admin/public\n\nUser-agent: EvilBot\nDisallow: /';
  assert.equal(robotsTxtAllows(body, '/news'), true);
  assert.equal(robotsTxtAllows(body, '/admin/x'), false);
  assert.equal(robotsTxtAllows(body, '/admin/public/notice'), true);
});

test('HTML link extraction resolves relative links and drops short/duplicate anchors', () => {
  const html = '<a href="/n/1">Tender notice for Shamshabad road widening works</a><a href="/n/1">Tender notice for Shamshabad road widening works</a><a href="/x">Home</a>';
  const links = extractLinks(html, 'https://hmda.test/');
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://hmda.test/n/1');
});
