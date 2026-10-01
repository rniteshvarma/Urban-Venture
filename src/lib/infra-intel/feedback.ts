/**
 * The learning loop's DB side. Every admin outcome (approve / reject /
 * revert) and every auto-applied signal that survives the grace window
 * updates (a) the source's learned trust and (b) the auto-apply threshold
 * for that event type × tier. Pure maths lives in policy.ts.
 */
import prisma from '../prisma';
import {
  computeTrust,
  defaultThreshold,
  IMPLICIT_OK_DAYS,
  nextThreshold,
  policyKey,
  type Outcome,
  type SourceTier,
} from './policy';
import type { EventType } from './text';

export async function getThreshold(event: EventType, tier: SourceTier): Promise<number> {
  const key = policyKey(event, tier);
  const row = await prisma.infraDecisionPolicy.findUnique({ where: { key } });
  if (row) return row.threshold;
  const created = await prisma.infraDecisionPolicy.create({ data: { key, threshold: defaultThreshold(event, tier) } });
  return created.threshold;
}

export async function recordOutcome(signalId: string, outcome: Outcome): Promise<void> {
  const signal = await prisma.infraSignal.findUnique({ where: { id: signalId }, include: { source: true } });
  if (!signal) return;
  const tier = signal.source.tier as SourceTier;
  const event = signal.eventType as EventType;

  // Source trust
  const inc = {
    approvedCount: outcome === 'APPROVED' ? 1 : 0,
    implicitOkCount: outcome === 'IMPLICIT_OK' ? 1 : 0,
    rejectedCount: outcome === 'REJECTED' ? 1 : 0,
    revertedCount: outcome === 'REVERTED' ? 1 : 0,
  };
  const s = signal.source;
  const counts = {
    approved: s.approvedCount + inc.approvedCount,
    implicitOk: s.implicitOkCount + inc.implicitOkCount,
    rejected: s.rejectedCount + inc.rejectedCount,
    reverted: s.revertedCount + inc.revertedCount,
  };
  await prisma.infraSource.update({
    where: { id: s.id },
    data: {
      approvedCount: counts.approved,
      implicitOkCount: counts.implicitOk,
      rejectedCount: counts.rejected,
      revertedCount: counts.reverted,
      trust: computeTrust(tier, counts),
    },
  });

  // Threshold for this event × tier
  const key = policyKey(event, tier);
  const current = await getThreshold(event, tier);
  await prisma.infraDecisionPolicy.update({
    where: { key },
    data: {
      threshold: nextThreshold(current, outcome, signal.decisionScore, signal.threshold || current),
      approvals: { increment: inc.approvedCount },
      implicitOk: { increment: inc.implicitOkCount },
      rejections: { increment: inc.rejectedCount },
      reverts: { increment: inc.revertedCount },
    },
  });
}

/** Credit auto-applied signals that nobody reverted within the grace window. */
export async function creditImplicitAccepts(): Promise<number> {
  const cutoff = new Date(Date.now() - IMPLICIT_OK_DAYS * 86400000);
  const due = await prisma.infraSignal.findMany({
    where: { decision: 'AUTO_APPLIED', learnedAt: null, createdAt: { lte: cutoff } },
    select: { id: true },
    take: 500,
  });
  for (const d of due) {
    await recordOutcome(d.id, 'IMPLICIT_OK');
    await prisma.infraSignal.update({ where: { id: d.id }, data: { learnedAt: new Date() } });
  }
  return due.length;
}

/** Recent reviewer rejections, fed to the extractor as "mistakes to avoid". */
export async function recentMistakes(limit = 8) {
  const rows = await prisma.infraSignal.findMany({
    where: { decision: { in: ['REJECTED', 'REVERTED'] } },
    orderBy: { reviewedAt: 'desc' },
    take: limit,
    include: { document: { select: { title: true } } },
  });
  return rows.map((r) => ({
    title: r.document?.title ?? r.projectName,
    extractedAs: `${r.eventType}${r.proposedStatus ? `/${r.proposedStatus}` : ''} for "${r.projectName}"`,
    note: r.reviewNote,
  }));
}
