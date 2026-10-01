/** GET ?decision=QUEUED|AUTO_APPLIED|APPROVED|REJECTED|REVERTED|IGNORED&limit=50 — review feed, focus zone first. */
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import type { InfraSignalDecision } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DECISIONS = ['AUTO_APPLIED', 'QUEUED', 'APPROVED', 'REJECTED', 'REVERTED', 'IGNORED'];
const ZONE_ORDER: Record<string, number> = { INSIDE_RRR: 0, RRR_BUFFER: 1, TELANGANA: 2 };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const decision = req.nextUrl.searchParams.get('decision') ?? 'QUEUED';
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get('limit') ?? 100));
  if (!DECISIONS.includes(decision)) return NextResponse.json({ error: 'bad decision' }, { status: 400 });
  const signals = await prisma.infraSignal.findMany({
    where: { decision: decision as InfraSignalDecision },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      source: { select: { name: true, tier: true, trust: true } },
      document: { select: { title: true, url: true, publisher: true, publishedAt: true } },
      infraProject: { select: { id: true, name: true, status: true } },
    },
  });
  if (decision === 'QUEUED') {
    signals.sort((a, b) => (ZONE_ORDER[a.focusZone ?? ''] ?? 3) - (ZONE_ORDER[b.focusZone ?? ''] ?? 3) || b.decisionScore - a.decisionScore);
  }
  const counts = await prisma.infraSignal.groupBy({ by: ['decision'], _count: true });
  return NextResponse.json({ signals, counts: Object.fromEntries(counts.map((c) => [c.decision, c._count])) });
}
