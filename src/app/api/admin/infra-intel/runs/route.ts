/**
 * POST /api/admin/infra-intel/runs — start a crawl (the admin "Refresh" button).
 * GET  — recent runs. The browser then calls /runs/[id]/process once per
 * source and /runs/[id]/finalize, so each request stays small and progress is live.
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { startRun } from '@/lib/infra-intel/pipeline';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const runs = await prisma.infraCrawlRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 });
  return NextResponse.json({ runs });
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const running = await prisma.infraCrawlRun.findFirst({
    where: { status: 'RUNNING', startedAt: { gte: new Date(Date.now() - 20 * 60000) } },
    orderBy: { startedAt: 'desc' },
  });
  if (running) return NextResponse.json({ error: 'A refresh is already running', runId: running.id }, { status: 409 });
  const run = await startRun('MANUAL', auth.userId);
  return NextResponse.json({ run });
}
