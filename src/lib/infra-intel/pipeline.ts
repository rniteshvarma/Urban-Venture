/**
 * Infra intelligence pipeline.
 *
 *   startRun ─► InfraSourceRun per eligible source
 *   processSourceRun (one source per request — fits serverless limits)
 *       fetch ─► InfraDocument (dedupe by URL) ─► relevance prefilter
 *       ─► extractFacts (Claude | rules) ─► handleFact:
 *            locate (gazetteer + RRR zone) ─► match project ─► plan delta
 *            ─► corroborate ─► decide (learned policy) ─► apply | queue | ignore
 *   finalizeRun ─► rescore affected corridors, credit implicit accepts
 *
 * The admin "Refresh" button drives startRun → processSourceRun×N → finalizeRun
 * from the browser so progress is visible; the daily cron runs the same steps
 * server-side within a time budget.
 */
import prisma from '../prisma';
import type { InfraSource, Prisma } from '@prisma/client';
import { fetchGoogleNews, fetchHtmlList, fetchRss, type FeedItem } from './fetchers';
import { isRelevant, type ExtractedFact, type EventType } from './text';
import { extractFacts, type ExtractInput } from './extract';
import { mentionsOutOfState, resolvePlaces } from './geo';
import { matchProject, sameProjectName, type MatchableProject } from './match';
import { decide, MIN_MATCH, type SourceTier } from './policy';
import { applyToExisting, createProjectFromFact, planChanges, revertApplied, type AppliedChanges, type ApplyContext } from './apply';
import { creditImplicitAccepts, getThreshold, recentMistakes, recordOutcome } from './feedback';
import { computeCorridorScore } from '../corridor-intelligence';

const MANUAL_COOLDOWN_MIN = 30;
const AUTO_PAUSE_AFTER_FAILURES = 6;
const CORROBORATION_DAYS = 14;
const NEW_MATCH_FLOOR = 0.5; // below this best-match score, a fact is about a new project

export type Trigger = 'MANUAL' | 'CRON';

// ── Runs ─────────────────────────────────────────────────────────────────────

export async function startRun(trigger: Trigger, triggeredBy: string | null) {
  const run = await prisma.infraCrawlRun.create({ data: { trigger, triggeredBy } });
  const sources = await prisma.infraSource.findMany({ where: { isActive: true }, orderBy: [{ kind: 'asc' }, { key: 'asc' }] });
  const now = Date.now();
  for (const s of sources) {
    const last = s.lastRunAt?.getTime() ?? 0;
    const due = trigger === 'MANUAL' ? now - last >= MANUAL_COOLDOWN_MIN * 60000 : now - last >= (s.cadenceHours - 1) * 3600000;
    await prisma.infraSourceRun.create({
      data: {
        runId: run.id,
        sourceId: s.id,
        status: due ? 'PENDING' : 'SKIPPED',
        error: due ? null : trigger === 'MANUAL' ? `Crawled < ${MANUAL_COOLDOWN_MIN} min ago` : 'Not due yet',
      },
    });
  }
  return getRun(run.id);
}

export async function getRun(runId: string) {
  return prisma.infraCrawlRun.findUnique({
    where: { id: runId },
    include: { sourceRuns: { include: { source: { select: { key: true, name: true, kind: true, tier: true } } }, orderBy: { id: 'asc' } } },
  });
}

async function markSourceHealth(source: InfraSource, ok: boolean, error?: string) {
  const failures = ok ? 0 : source.consecutiveFailures + 1;
  await prisma.infraSource.update({
    where: { id: source.id },
    data: {
      lastRunAt: new Date(),
      ...(ok ? { lastOkAt: new Date(), lastError: null } : { lastError: error?.slice(0, 300) ?? 'error' }),
      consecutiveFailures: failures,
      ...(failures >= AUTO_PAUSE_AFTER_FAILURES ? { isActive: false } : {}),
    },
  });
}

async function fetchSource(source: InfraSource): Promise<FeedItem[]> {
  const cfg = (source.config ?? {}) as { query?: string; include?: string; exclude?: string; maxItems?: number; windowDays?: number };
  let items: FeedItem[];
  if (source.kind === 'GOOGLE_NEWS') items = await fetchGoogleNews(cfg.query ?? source.name, cfg.windowDays ?? 14);
  else if (source.kind === 'RSS') items = await fetchRss(source.url);
  else if (source.kind === 'HTML_LIST') items = await fetchHtmlList(source.url, cfg.include, cfg.exclude);
  else items = [];
  return items.slice(0, cfg.maxItems ?? 60);
}

export interface ProcessResult {
  status: string;
  more: boolean;
  fetched: number;
  newDocs: number;
  signals: number;
  autoApplied: number;
  queued: number;
  error?: string;
}

export async function processSourceRun(sourceRunId: string): Promise<ProcessResult> {
  const sr = await prisma.infraSourceRun.findUnique({ where: { id: sourceRunId }, include: { source: true } });
  if (!sr) throw new Error('source run not found');
  if (sr.status === 'DONE' || sr.status === 'SKIPPED' || sr.status === 'FAILED') {
    return { status: sr.status, more: false, fetched: sr.fetched, newDocs: sr.newDocs, signals: sr.signals, autoApplied: sr.autoApplied, queued: sr.queued };
  }
  await prisma.infraSourceRun.update({ where: { id: sr.id }, data: { status: 'RUNNING', startedAt: sr.startedAt ?? new Date() } });
  const source = sr.source;

  try {
    if (source.kind === 'AGENT') {
      const { runAgentBatch } = await import('./agent');
      const r = await runAgentBatch(source);
      const totals = await prisma.infraSourceRun.update({
        where: { id: sr.id },
        data: {
          status: r.skipped ? 'SKIPPED' : r.more ? 'RUNNING' : 'DONE',
          error: r.skipped ?? null,
          fetched: { increment: r.checked },
          signals: { increment: r.signals },
          autoApplied: { increment: r.autoApplied },
          queued: { increment: r.queued },
          finishedAt: r.more ? null : new Date(),
        },
      });
      if (!r.more && !r.skipped) await markSourceHealth(source, true);
      return { status: totals.status, more: r.more, fetched: totals.fetched, newDocs: 0, signals: totals.signals, autoApplied: totals.autoApplied, queued: totals.queued, error: r.skipped };
    }

    const items = await fetchSource(source);
    const known = new Set((await prisma.infraDocument.findMany({ where: { url: { in: items.map((i) => i.url) } }, select: { url: true } })).map((d) => d.url));
    const fresh = items.filter((i) => !known.has(i.url));

    const docs = [];
    for (const it of fresh) {
      const text = `${it.title} ${it.summary ?? ''}`;
      const doc = await prisma.infraDocument.create({
        data: {
          sourceId: source.id,
          url: it.url,
          title: it.title.slice(0, 500),
          summary: it.summary?.slice(0, 500) ?? null,
          publisher: it.publisher,
          publishedAt: it.publishedAt,
          contentHash: hashTitle(it.title),
          relevant: isRelevant(text),
        },
      });
      docs.push(doc);
    }

    const relevant = docs.filter((d) => d.relevant);
    const counts = { signals: 0, autoApplied: 0, queued: 0 };
    if (relevant.length > 0) {
      const projects = await loadMatchable();
      const inputs: ExtractInput[] = relevant.map((d) => ({ key: d.id, title: d.title, summary: d.summary, publisher: d.publisher, publishedAt: d.publishedAt }));
      const facts = await extractFacts(inputs, projects.map((p) => ({ id: p.id, name: p.name, status: p.status })), await recentMistakes());
      for (const d of relevant) {
        const r = facts.get(d.id);
        if (r?.fact) {
          const outcome = await handleFact({
            fact: r.fact,
            extractor: r.extractor,
            source,
            documentId: d.id,
            headline: d.title,
            text: `${d.title} ${d.summary ?? ''}`,
            url: d.url,
            eventDate: d.publishedAt,
            projects,
          });
          counts.signals++;
          if (outcome === 'AUTO_APPLIED') counts.autoApplied++;
          if (outcome === 'QUEUED') counts.queued++;
        }
        await prisma.infraDocument.update({ where: { id: d.id }, data: { processedAt: new Date(), relevant: !!r?.fact } });
      }
    }

    await markSourceHealth(source, true);
    await prisma.infraSourceRun.update({
      where: { id: sr.id },
      data: { status: 'DONE', fetched: items.length, newDocs: docs.length, ...counts, finishedAt: new Date() },
    });
    return { status: 'DONE', more: false, fetched: items.length, newDocs: docs.length, ...counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markSourceHealth(source, false, message);
    await prisma.infraSourceRun.update({ where: { id: sr.id }, data: { status: 'FAILED', error: message.slice(0, 300), finishedAt: new Date() } });
    return { status: 'FAILED', more: false, fetched: 0, newDocs: 0, signals: 0, autoApplied: 0, queued: 0, error: message };
  }
}

export async function finalizeRun(runId: string) {
  const run = await prisma.infraCrawlRun.findUnique({ where: { id: runId }, include: { sourceRuns: true } });
  if (!run) throw new Error('run not found');
  // Anything still pending (cron ran out of time) is left for the next run.
  await prisma.infraSourceRun.updateMany({ where: { runId, status: { in: ['PENDING', 'RUNNING'] } }, data: { status: 'SKIPPED', error: 'Carried over to next run' } });

  const applied = await prisma.infraSignal.findMany({
    where: { createdAt: { gte: run.startedAt }, decision: 'AUTO_APPLIED' },
    select: { infraProjectId: true },
  });
  const corridors = await corridorsForProjects(applied.map((a) => a.infraProjectId).filter((x): x is string => !!x));
  const rescored: string[] = [];
  for (const slug of corridors) {
    try {
      await computeCorridorScore(slug);
      rescored.push(slug);
    } catch (e) {
      console.error(`[infra-intel] rescore ${slug} failed`, e);
    }
  }
  const implicit = await creditImplicitAccepts();
  const fresh = await prisma.infraSourceRun.findMany({ where: { runId } });
  const summary = {
    sources: fresh.length,
    done: fresh.filter((s) => s.status === 'DONE').length,
    failed: fresh.filter((s) => s.status === 'FAILED').length,
    skipped: fresh.filter((s) => s.status === 'SKIPPED').length,
    fetched: fresh.reduce((a, s) => a + s.fetched, 0),
    newDocs: fresh.reduce((a, s) => a + s.newDocs, 0),
    signals: fresh.reduce((a, s) => a + s.signals, 0),
    autoApplied: fresh.reduce((a, s) => a + s.autoApplied, 0),
    queued: fresh.reduce((a, s) => a + s.queued, 0),
    implicitAcceptsCredited: implicit,
  };
  await prisma.infraCrawlRun.update({ where: { id: runId }, data: { status: 'DONE', finishedAt: new Date(), corridorsRescored: rescored, summary } });
  return { ...summary, corridorsRescored: rescored };
}

/** Cron entry: run every due source within a time budget, then finalize. */
export async function runScheduled(budgetMs: number) {
  const deadline = Date.now() + budgetMs;
  const run = await startRun('CRON', null);
  if (!run) throw new Error('failed to start run');
  for (const sr of run.sourceRuns.filter((s) => s.status === 'PENDING')) {
    if (Date.now() > deadline - 20000) break;
    let r = await processSourceRun(sr.id);
    while (r.more && Date.now() < deadline - 60000) r = await processSourceRun(sr.id);
  }
  return { runId: run.id, ...(await finalizeRun(run.id)) };
}

// ── Facts → signals ──────────────────────────────────────────────────────────

export interface LoadedProject extends MatchableProject {
  status: string;
}

export async function loadMatchable(): Promise<LoadedProject[]> {
  return prisma.infraProject.findMany({ where: { isPublished: true }, select: { id: true, name: true, shortName: true, tags: true, status: true } });
}

function hashTitle(title: string): string {
  const norm = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  let h = 0;
  for (let i = 0; i < norm.length; i++) h = (Math.imul(31, h) + norm.charCodeAt(i)) | 0;
  return `t${(h >>> 0).toString(36)}`;
}

export interface FactContext {
  fact: ExtractedFact;
  extractor: 'claude' | 'rules' | 'agent';
  source: InfraSource;
  documentId: string | null;
  headline: string;
  text: string;
  url: string | null;
  eventDate: Date | null;
  projects: LoadedProject[];
  /** Pre-resolved project (agent status checks know which project they asked about). */
  forcedProjectId?: string;
  extra?: Record<string, unknown>;
}

export async function handleFact(c: FactContext): Promise<'AUTO_APPLIED' | 'QUEUED' | 'IGNORED'> {
  const { fact, source } = c;
  const tier = source.tier as SourceTier;
  const loc = fact.places.length > 0 ? resolvePlaces(fact.places) : resolvePlaces(c.text);
  const resolved = loc.lat !== null ? loc : resolvePlaces(c.text);
  // No Telangana place and an out-of-state one named → outside our universe.
  const located = resolved.zone === null && mentionsOutOfState(c.text) ? { ...resolved, zone: 'OUTSIDE' as const } : resolved;

  // Which project?
  let projectId: string | null = null;
  let matchScore = 0;
  if (c.forcedProjectId) {
    projectId = c.forcedProjectId;
    matchScore = 0.95;
  } else if (fact.matchedProjectId) {
    projectId = fact.matchedProjectId;
    matchScore = 0.9;
  } else {
    const m = matchProject(c.projects, fact.projectName, c.text);
    projectId = m.score >= NEW_MATCH_FLOOR ? m.projectId : null;
    matchScore = m.score;
  }
  const isNew = projectId === null;
  let eventType: EventType = fact.eventType;
  if (isNew && eventType !== 'OTHER') eventType = 'NEW_PROJECT';

  // What would change?
  let hasDelta = true;
  let statusRegression = false;
  let notes: string[] = [];
  let ignoreReason: string | null = null;
  if (fact.eventType === 'OTHER' && (isNew || (fact.completionPct === null && fact.investmentCr === null))) {
    hasDelta = false;
    ignoreReason = 'Not an actionable development';
  } else if (!isNew && projectId) {
    const project = await prisma.infraProject.findUnique({ where: { id: projectId } });
    if (project) {
      const milestoneExists = c.url ? (await prisma.infraMilestone.count({ where: { projectId, sourceUrl: c.url } })) > 0 : false;
      const plan = planChanges(project, fact, c.headline, milestoneExists);
      hasDelta = plan.hasDelta;
      statusRegression = plan.statusRegression;
      notes = plan.notes;
    }
  }

  // Corroboration: distinct sources reporting the same thing recently.
  const since = new Date(Date.now() - CORROBORATION_DAYS * 86400000);
  let corroboration = 1;
  let duplicateOf: { id: string; corroboration: number; sourceId: string } | null = null;
  if (isNew && hasDelta) {
    const pendingNew = await prisma.infraSignal.findMany({
      where: { eventType: 'NEW_PROJECT', createdAt: { gte: since }, decision: { in: ['QUEUED', 'AUTO_APPLIED', 'APPROVED'] } },
      select: { id: true, projectName: true, corroboration: true, sourceId: true, decision: true, infraProjectId: true, investmentCr: true, category: true },
    });
    const sameMoney = (x: number | null) => x !== null && fact.investmentCr !== null && fact.investmentCr >= 100 && Math.abs(x - fact.investmentCr) / fact.investmentCr < 0.02;
    const dup = pendingNew.find((p) => sameProjectName(p.projectName, fact.projectName) || (sameMoney(p.investmentCr) && p.category === fact.category));
    if (dup) duplicateOf = dup;
  } else if (projectId && fact.proposedStatus) {
    const same = await prisma.infraSignal.findMany({
      where: { infraProjectId: projectId, proposedStatus: fact.proposedStatus, createdAt: { gte: since }, NOT: { sourceId: source.id } },
      select: { sourceId: true },
      distinct: ['sourceId'],
    });
    corroboration = 1 + same.length;
  }

  const threshold = await getThreshold(eventType, tier);
  let result = decide({
    eventType,
    tier,
    confidence: fact.confidence,
    sourceTrust: source.trust,
    isNewProject: isNew,
    matchScore,
    corroboration,
    hasDelta,
    statusRegression,
    proposedStatus: fact.proposedStatus,
    zone: located.zone,
    threshold,
  });
  if (ignoreReason && result.decision === 'IGNORED') result = { ...result, reason: ignoreReason };
  if (isNew && result.decision === 'AUTO_APPLIED' && c.extractor === 'rules') {
    result = { ...result, decision: 'QUEUED', reason: `${result.reason}, but keyword extraction never creates projects on its own (needs Claude or review)` };
  }
  if (isNew && result.decision === 'AUTO_APPLIED' && located.lat === null) {
    result = { ...result, decision: 'QUEUED', reason: 'New project but location could not be resolved — place it on the map first' };
  }
  if (!isNew && matchScore >= NEW_MATCH_FLOOR && matchScore < MIN_MATCH && result.decision !== 'IGNORED') {
    result = { ...result, decision: 'QUEUED' };
  }

  // Same new project already known from another source → corroborate that signal instead.
  if (duplicateOf) {
    const extra = duplicateOf.sourceId !== source.id ? 1 : 0;
    await createSignal(c, { eventType, projectId: null, matchScore, loc: located, corroboration: 1, decision: 'IGNORED', reason: `Duplicate of signal ${duplicateOf.id}`, score: result.score, threshold });
    if (extra) {
      const updated = await prisma.infraSignal.update({ where: { id: duplicateOf.id }, data: { corroboration: { increment: 1 } }, include: { source: true } });
      if (updated.decision === 'QUEUED') await redecideQueuedNewProject(updated.id);
    }
    return 'IGNORED';
  }

  const signal = await createSignal(c, { eventType, projectId, matchScore, loc: located, corroboration, decision: result.decision, reason: result.reason, score: result.score, threshold, notes });
  if (result.decision !== 'AUTO_APPLIED') return result.decision;

  const applied = await applySignalRow(signal.id, projectId);
  if (!applied) {
    await prisma.infraSignal.update({ where: { id: signal.id }, data: { decision: 'IGNORED', decisionReason: 'No change to apply (already known)' } });
    return 'IGNORED';
  }
  if (applied.createdProject) {
    const p = await prisma.infraProject.findUnique({ where: { id: applied.projectId }, select: { id: true, name: true, shortName: true, tags: true, status: true } });
    if (p) c.projects.push(p);
  }
  return 'AUTO_APPLIED';
}

interface SignalMeta {
  eventType: EventType;
  projectId: string | null;
  matchScore: number;
  loc: { places: string[]; lat: number | null; lng: number | null; zone: string | null };
  corroboration: number;
  decision: 'AUTO_APPLIED' | 'QUEUED' | 'IGNORED';
  reason: string;
  score: number;
  threshold: number;
  notes?: string[];
}

async function createSignal(c: FactContext, m: SignalMeta) {
  const f = c.fact;
  return prisma.infraSignal.create({
    data: {
      documentId: c.documentId,
      sourceId: c.source.id,
      infraProjectId: m.projectId,
      eventType: m.eventType,
      projectName: f.projectName.slice(0, 200) || c.headline.slice(0, 200),
      category: f.category,
      proposedStatus: f.proposedStatus,
      completionPct: f.completionPct,
      investmentCr: f.investmentCr,
      lengthKm: f.lengthKm,
      goRef: f.goRef,
      places: m.loc.places,
      latitude: m.loc.lat,
      longitude: m.loc.lng,
      focusZone: m.loc.zone,
      eventDate: c.eventDate,
      extracted: { fact: f, headline: c.headline, url: c.url, notes: m.notes ?? [], ...(c.extra ?? {}) } as unknown as Prisma.InputJsonValue,
      extractor: c.extractor,
      matchScore: m.matchScore,
      confidence: f.confidence,
      corroboration: m.corroboration,
      decisionScore: m.score,
      threshold: m.threshold,
      decision: m.decision,
      decisionReason: m.reason,
    },
  });
}

/** Apply a stored signal (auto or on approval). `projectId` null → create the project. */
async function applySignalRow(signalId: string, projectId: string | null): Promise<AppliedChanges | null> {
  const s = await prisma.infraSignal.findUnique({ where: { id: signalId }, include: { source: true } });
  if (!s) return null;
  const ex = s.extracted as unknown as { fact: ExtractedFact; headline: string; url: string | null };
  const ctx: ApplyContext = {
    signalId,
    fact: ex.fact,
    headline: ex.headline,
    sourceUrl: ex.url,
    sourceName: s.source.name,
    eventDate: s.eventDate,
    lat: s.latitude,
    lng: s.longitude,
  };
  const applied = await prisma.$transaction(async (tx) => (projectId ? applyToExisting(tx, projectId, ctx) : createProjectFromFact(tx, ctx)));
  if (applied) {
    await prisma.infraSignal.update({
      where: { id: signalId },
      data: { appliedChanges: applied as unknown as Prisma.InputJsonValue, infraProjectId: applied.projectId },
    });
  }
  return applied;
}

async function redecideQueuedNewProject(signalId: string) {
  const s = await prisma.infraSignal.findUnique({ where: { id: signalId }, include: { source: true } });
  if (!s || s.decision !== 'QUEUED' || s.eventType !== 'NEW_PROJECT' || s.latitude === null || s.extractor === 'rules') {
    if (s && s.decision === 'QUEUED') {
      const why = s.extractor === 'rules' ? 'New project found by keyword extraction — review to add it' : s.decisionReason.replace(/ · corroborated by \d+ sources$/, '');
      await prisma.infraSignal.update({ where: { id: s.id }, data: { decisionReason: `${why} · corroborated by ${s.corroboration} sources` } });
    }
    return;
  }
  const tier = s.source.tier as SourceTier;
  const threshold = await getThreshold('NEW_PROJECT', tier);
  const r = decide({
    eventType: 'NEW_PROJECT',
    tier,
    confidence: s.confidence,
    sourceTrust: s.source.trust,
    isNewProject: true,
    matchScore: 1,
    corroboration: s.corroboration,
    hasDelta: true,
    statusRegression: false,
    proposedStatus: s.proposedStatus,
    zone: s.focusZone,
    threshold,
  });
  if (r.decision !== 'AUTO_APPLIED') {
    await prisma.infraSignal.update({ where: { id: s.id }, data: { decisionScore: r.score, decisionReason: r.reason } });
    return;
  }
  const applied = await applySignalRow(s.id, null);
  if (applied) {
    await prisma.infraSignal.update({
      where: { id: s.id },
      data: { decision: 'AUTO_APPLIED', decisionScore: r.score, threshold, decisionReason: `Corroborated by ${s.corroboration} sources — ${r.reason}` },
    });
  }
}

// ── Review actions ───────────────────────────────────────────────────────────

async function corridorsForProjects(projectIds: string[]): Promise<string[]> {
  if (projectIds.length === 0) return [];
  const projects = await prisma.infraProject.findMany({ where: { id: { in: projectIds } }, select: { affectedCorridorSlugs: true } });
  return [...new Set(projects.flatMap((p) => p.affectedCorridorSlugs))];
}

export async function rescoreForProjects(projectIds: string[]): Promise<string[]> {
  const slugs = await corridorsForProjects(projectIds);
  for (const slug of slugs) {
    try {
      await computeCorridorScore(slug);
    } catch (e) {
      console.error(`[infra-intel] rescore ${slug} failed`, e);
    }
  }
  return slugs;
}

export type ReviewAction = 'approve' | 'reject' | 'revert';

export async function reviewSignal(signalId: string, action: ReviewAction, userId: string, opts: { note?: string; projectId?: string | null } = {}) {
  const s = await prisma.infraSignal.findUnique({ where: { id: signalId } });
  if (!s) throw new Error('Signal not found');
  const stamp = { reviewedBy: userId, reviewedAt: new Date(), reviewNote: opts.note ?? null };

  if (action === 'approve') {
    if (s.decision !== 'QUEUED') throw new Error(`Only queued signals can be approved (this one is ${s.decision})`);
    const targetProject = opts.projectId !== undefined ? opts.projectId : s.infraProjectId;
    const applied = await applySignalRow(s.id, targetProject);
    await prisma.infraSignal.update({
      where: { id: s.id },
      data: { ...stamp, decision: applied ? 'APPROVED' : 'IGNORED', decisionReason: applied ? 'Approved by admin' : 'Approved, but nothing left to change' },
    });
    if (applied) await recordOutcome(s.id, 'APPROVED');
    const corridors = applied ? await rescoreForProjects([applied.projectId]) : [];
    return { decision: applied ? 'APPROVED' : 'IGNORED', applied, corridors };
  }

  if (action === 'reject') {
    if (s.decision !== 'QUEUED') throw new Error(`Only queued signals can be rejected (this one is ${s.decision})`);
    await prisma.infraSignal.update({ where: { id: s.id }, data: { ...stamp, decision: 'REJECTED' } });
    await recordOutcome(s.id, 'REJECTED');
    return { decision: 'REJECTED', corridors: [] };
  }

  // revert
  if ((s.decision !== 'AUTO_APPLIED' && s.decision !== 'APPROVED') || !s.appliedChanges) {
    throw new Error('Only applied signals can be reverted');
  }
  const changes = s.appliedChanges as unknown as AppliedChanges;
  await prisma.$transaction(async (tx) => revertApplied(tx, changes));
  await prisma.infraSignal.update({ where: { id: s.id }, data: { ...stamp, decision: 'REVERTED' } });
  await recordOutcome(s.id, 'REVERTED');
  const corridors = await rescoreForProjects([changes.projectId]);
  return { decision: 'REVERTED', corridors };
}
