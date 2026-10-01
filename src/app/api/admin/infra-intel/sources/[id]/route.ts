/** PATCH { isActive } — pause/resume a source (resuming clears its failure streak). */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const parsed = z.object({ isActive: z.boolean() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const source = await prisma.infraSource.update({
    where: { id },
    data: { isActive: parsed.data.isActive, ...(parsed.data.isActive ? { consecutiveFailures: 0 } : {}) },
  });
  return NextResponse.json({ source });
}
