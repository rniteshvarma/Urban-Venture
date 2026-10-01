/** POST { sourceRunId } — crawl + extract + decide for ONE source. Returns { more } for batched sources (AI status check). */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { processSourceRun } from '@/lib/infra-intel/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { sourceRunId?: string };
  if (!body.sourceRunId) return NextResponse.json({ error: 'sourceRunId required' }, { status: 400 });
  const sr = await prisma.infraSourceRun.findUnique({ where: { id: body.sourceRunId }, select: { runId: true } });
  if (!sr || sr.runId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const result = await processSourceRun(body.sourceRunId);
  return NextResponse.json(result);
}
