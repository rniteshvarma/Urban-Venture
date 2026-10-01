/** GET — header stats, learned policy table and last run for the Infra Updates page. */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { claudeEnabled } from '@/lib/infra-intel/extract';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [lastRun, queued, appliedWeek, newProjectsWeek, policies, snapshots] = await Promise.all([
    prisma.infraCrawlRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.infraSignal.count({ where: { decision: 'QUEUED' } }),
    prisma.infraSignal.count({ where: { decision: { in: ['AUTO_APPLIED', 'APPROVED'] }, createdAt: { gte: weekAgo } } }),
    prisma.infraProject.count({ where: { autoCreated: true, isPublished: true, createdAt: { gte: weekAgo } } }),
    prisma.infraDecisionPolicy.findMany({ orderBy: { key: 'asc' } }),
    prisma.corridorScoreSnapshot.findMany({ where: { computedAt: { gte: weekAgo } }, orderBy: { computedAt: 'asc' } }),
  ]);
  const moves = new Map<string, { from: number; to: number }>();
  for (const s of snapshots) {
    const m = moves.get(s.corridorSlug);
    if (m) m.to = s.infraScore;
    else moves.set(s.corridorSlug, { from: s.infraScore, to: s.infraScore });
  }
  return NextResponse.json({
    lastRun,
    queued,
    appliedWeek,
    newProjectsWeek,
    claude: claudeEnabled(),
    policies,
    movers: [...moves.entries()].map(([slug, m]) => ({ slug, ...m })).filter((m) => m.from !== m.to),
  });
}
