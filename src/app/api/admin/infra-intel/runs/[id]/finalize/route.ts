/** POST — close the run: rescore affected corridors and credit implicit accepts. */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { finalizeRun } from '@/lib/infra-intel/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  try {
    return NextResponse.json(await finalizeRun(id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
