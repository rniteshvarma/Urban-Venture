/**
 * Turning a fact into concrete InfraProject changes — and undoing them.
 *
 * `planChanges` is pure: given the current project and a fact it says what
 * would change (status forward only, completion % up only, missing numbers
 * filled, a milestone for dated events) and whether the change is a
 * regression. `applySignal` writes it in one transaction together with an
 * InfraStatusHistory row (bi-temporal: observedAt = event date, knownAt =
 * now) and stores a before-snapshot so `revertSignal` can restore exactly.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { STATUS_RANK, type ExtractedFact } from './text';
import { classifyZone, haversineKm } from './geo';
import { computeImpact } from './scoring';

export interface ProjectState {
  id: string;
  status: string;
  completionPct: number;
  totalInvestmentCr: number | null;
  totalLengthKm: number | null;
  estimatedCompletion: string | null;
  sourceGO: string | null;
}

export interface ChangePlan {
  hasDelta: boolean;
  statusRegression: boolean;
  update: Partial<Pick<ProjectState, 'status' | 'completionPct' | 'totalInvestmentCr' | 'totalLengthKm' | 'estimatedCompletion' | 'sourceGO'>>;
  milestone: { title: string; status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' } | null;
  notes: string[];
}

const MILESTONE_EVENTS = new Set(['TENDER', 'BUDGET', 'LAND_ACQUISITION', 'COMPLETION', 'MILESTONE', 'DELAY']);

export function planChanges(project: ProjectState, fact: ExtractedFact, headline: string, milestoneExists: boolean): ChangePlan {
  const update: ChangePlan['update'] = {};
  const notes: string[] = [];
  let statusRegression = false;

  const proposed = fact.proposedStatus;
  if (proposed && proposed !== project.status) {
    const cur = STATUS_RANK[project.status];
    const next = STATUS_RANK[proposed];
    if (proposed === 'DELAYED' || proposed === 'CANCELLED') {
      if (project.status !== 'COMPLETE') {
        update.status = proposed;
        notes.push(`status ${project.status} → ${proposed}`);
      }
    } else if (cur === undefined) {
      // Currently DELAYED/CANCELLED and news shows progress again → resume.
      update.status = proposed;
      notes.push(`status ${project.status} → ${proposed} (resumed)`);
    } else if (next > cur) {
      update.status = proposed;
      notes.push(`status ${project.status} → ${proposed}`);
    } else if (next < cur) {
      statusRegression = true;
      notes.push(`would move status backwards (${project.status} → ${proposed}); not applied automatically`);
    }
  }

  if (fact.completionPct !== null && fact.completionPct > project.completionPct) {
    update.completionPct = fact.completionPct;
    notes.push(`completion ${project.completionPct}% → ${fact.completionPct}%`);
    if (!update.status && (STATUS_RANK[project.status] ?? 0) < STATUS_RANK.UNDER_CONSTRUCTION && fact.completionPct > 0) {
      update.status = fact.completionPct >= 100 ? 'COMPLETE' : 'UNDER_CONSTRUCTION';
      notes.push(`status ${project.status} → ${update.status} (from progress)`);
    }
  }
  if (fact.investmentCr !== null && project.totalInvestmentCr === null) {
    update.totalInvestmentCr = fact.investmentCr;
    notes.push(`investment ₹${fact.investmentCr.toLocaleString('en-IN')} cr`);
  }
  if (fact.lengthKm !== null && project.totalLengthKm === null) {
    update.totalLengthKm = fact.lengthKm;
    notes.push(`length ${fact.lengthKm} km`);
  }
  if (fact.targetCompletion && fact.targetCompletion !== project.estimatedCompletion && (update.status ?? project.status) !== 'COMPLETE') {
    update.estimatedCompletion = fact.targetCompletion;
    notes.push(`target ${project.estimatedCompletion ?? '—'} → ${fact.targetCompletion}`);
  }
  if (fact.goRef && !project.sourceGO) {
    update.sourceGO = fact.goRef;
    notes.push(`GO ${fact.goRef}`);
  }

  let milestone: ChangePlan['milestone'] = null;
  if (MILESTONE_EVENTS.has(fact.eventType) && !milestoneExists) {
    milestone = {
      title: (fact.summary || headline).slice(0, 160),
      status: fact.eventType === 'COMPLETION' || fact.eventType === 'BUDGET' || fact.eventType === 'TENDER' ? 'COMPLETED' : 'IN_PROGRESS',
    };
    notes.push(`milestone: ${milestone.title.slice(0, 60)}`);
  }

  // A target date alone is not worth a write unless something else changed.
  const substantive = Object.keys(update).filter((k) => k !== 'estimatedCompletion').length > 0 || milestone !== null;
  return { hasDelta: substantive, statusRegression, update: substantive ? update : {}, milestone: substantive ? milestone : null, notes };
}

// ── DB side ──────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient | PrismaClient;

export interface ApplyContext {
  signalId: string;
  fact: ExtractedFact;
  headline: string;
  sourceUrl: string | null;
  sourceName: string;
  eventDate: Date | null;
  lat: number | null;
  lng: number | null;
}

export interface AppliedChanges {
  projectId: string;
  createdProject?: boolean;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  milestoneId?: string;
  statusHistoryId?: string;
  notes: string[];
}

/** Corridors whose centroid lies within `radiusKm` of a point. */
export async function corridorsNear(db: Tx, lat: number, lng: number, radiusKm: number): Promise<string[]> {
  const corridors = await db.corridorProfile.findMany({ select: { slug: true, centroidLat: true, centroidLng: true } });
  return corridors
    .filter((c) => c.centroidLat !== null && c.centroidLng !== null && haversineKm(lat, lng, c.centroidLat, c.centroidLng) <= radiusKm)
    .map((c) => c.slug);
}

export async function applyToExisting(db: Tx, projectId: string, ctx: ApplyContext): Promise<AppliedChanges | null> {
  const project = await db.infraProject.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const milestoneExists = ctx.sourceUrl ? (await db.infraMilestone.count({ where: { projectId, sourceUrl: ctx.sourceUrl } })) > 0 : false;
  const plan = planChanges(project, ctx.fact, ctx.headline, milestoneExists);
  if (!plan.hasDelta) return null;

  const before: Record<string, unknown> = {
    lastVerifiedDate: project.lastVerifiedDate,
    lastVerifiedSource: project.lastVerifiedSource,
    lastSignalAt: project.lastSignalAt,
  };
  for (const k of Object.keys(plan.update)) before[k] = (project as Record<string, unknown>)[k];

  const now = new Date();
  await db.infraProject.update({
    where: { id: projectId },
    data: { ...(plan.update as Prisma.InfraProjectUpdateInput), lastVerifiedDate: now, lastVerifiedSource: ctx.sourceName, lastSignalAt: now },
  });

  let statusHistoryId: string | undefined;
  if (plan.update.status) {
    const h = await db.infraStatusHistory.create({
      data: {
        infraProjectId: projectId,
        status: plan.update.status as Prisma.InfraStatusHistoryCreateInput['status'],
        completionPct: plan.update.completionPct ?? project.completionPct,
        observedAt: ctx.eventDate ?? now,
        knownAt: now,
        sourceRef: ctx.fact.goRef ?? `signal:${ctx.signalId}`,
        sourceUrl: ctx.sourceUrl,
      },
    });
    statusHistoryId = h.id;
  }
  let milestoneId: string | undefined;
  if (plan.milestone) {
    const m = await db.infraMilestone.create({
      data: { projectId, title: plan.milestone.title, status: plan.milestone.status, date: ctx.eventDate ?? now, sourceUrl: ctx.sourceUrl, description: `Auto-captured from ${ctx.sourceName}` },
    });
    milestoneId = m.id;
  }
  return { projectId, before, after: plan.update, milestoneId, statusHistoryId, notes: plan.notes };
}

export async function createProjectFromFact(db: Tx, ctx: ApplyContext): Promise<AppliedChanges> {
  const f = ctx.fact;
  const category = (f.category ?? 'ROAD_HIGHWAY') as Prisma.InfraProjectCreateInput['category'];
  const status = (f.proposedStatus && f.proposedStatus !== 'DELAYED' && f.proposedStatus !== 'CANCELLED' ? f.proposedStatus : 'ANNOUNCED') as Prisma.InfraProjectCreateInput['status'];
  const impact = computeImpact({ category, totalInvestmentCr: f.investmentCr, totalLengthKm: f.lengthKm });
  const radius = category === 'ROAD_HIGHWAY' ? 8 : category === 'METRO_RAIL' ? 5 : 10;
  const corridors = ctx.lat !== null && ctx.lng !== null ? await corridorsNear(db, ctx.lat, ctx.lng, radius * 1.5) : [];
  const now = new Date();
  const p = await db.infraProject.create({
    data: {
      name: f.projectName.slice(0, 160),
      shortName: f.projectName.slice(0, 40),
      category,
      description: f.summary || ctx.headline,
      status,
      completionPct: f.completionPct ?? 0,
      estimatedCompletion: f.targetCompletion,
      totalLengthKm: f.lengthKm,
      totalInvestmentCr: f.investmentCr,
      sourceGO: f.goRef,
      sourceUrl: ctx.sourceUrl,
      sourceAuthority: ctx.sourceName,
      lastVerifiedDate: now,
      lastVerifiedSource: ctx.sourceName,
      lastSignalAt: now,
      routeDescription: f.places.length ? f.places.join(' → ') : null,
      affectedCorridorSlugs: corridors,
      affectedCorridors: corridors,
      impactRadiusKm: radius,
      impactRadius: radius,
      latitude: ctx.lat,
      longitude: ctx.lng,
      reImpactScore: impact,
      computedImpact: impact,
      focusZone: ctx.lat !== null && ctx.lng !== null ? classifyZone(ctx.lat, ctx.lng) : null,
      autoCreated: true,
      isPublished: true,
      tags: ['auto'],
    },
  });
  const h = await db.infraStatusHistory.create({
    data: { infraProjectId: p.id, status, completionPct: p.completionPct, observedAt: ctx.eventDate ?? now, knownAt: now, sourceRef: `signal:${ctx.signalId}`, sourceUrl: ctx.sourceUrl },
  });
  return { projectId: p.id, createdProject: true, statusHistoryId: h.id, notes: [`created project "${p.name}" (${status})`, corridors.length ? `affects ${corridors.join(', ')}` : 'no corridor within range'] };
}

/** Undo an applied signal. Created projects are unpublished (kept for audit), not deleted. */
export async function revertApplied(db: Tx, changes: AppliedChanges): Promise<void> {
  if (changes.createdProject) {
    await db.infraProject.update({ where: { id: changes.projectId }, data: { isPublished: false } });
  } else if (changes.before) {
    await db.infraProject.update({ where: { id: changes.projectId }, data: changes.before as Prisma.InfraProjectUpdateInput });
  }
  if (changes.milestoneId) await db.infraMilestone.deleteMany({ where: { id: changes.milestoneId } });
  if (changes.statusHistoryId) await db.infraStatusHistory.deleteMany({ where: { id: changes.statusHistoryId } });
}
