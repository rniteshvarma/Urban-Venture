/** GET /api/admin/extraction/[jobId] — job status + progress (polled by the UI). */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jobId } = await ctx.params;
  const job = await prisma.extractionJob.findUnique({
    where: { id: jobId },
    include: { inputs: { orderBy: { displayOrder: 'asc' } } },
  });
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(job);
}
