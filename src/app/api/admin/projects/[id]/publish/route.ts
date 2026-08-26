/** POST /api/admin/projects/[id]/publish — publish a reviewed draft. */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.project.update({ where: { id }, data: { reviewState: 'PUBLISHED', status: 'ACTIVE' } });
  // Finalise field audits (mark as reviewed). Full automation wiring lands with the review UI milestone.
  await prisma.projectFieldAudit.updateMany({ where: { projectId: id, correctedBy: null }, data: { correctedBy: session.user.id, correctedAt: new Date() } });

  return NextResponse.json({ success: true });
}
