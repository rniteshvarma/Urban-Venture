import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const sources = await prisma.infraSource.findMany({ orderBy: [{ tier: 'asc' }, { key: 'asc' }] });
  return NextResponse.json({ sources });
}
