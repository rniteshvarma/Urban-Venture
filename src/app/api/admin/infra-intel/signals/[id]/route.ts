/**
 * POST { action: approve|reject|revert, note?, projectId? } — admin review.
 * Every outcome feeds the learning loop (source trust + per-event thresholds).
 * `projectId` on approve re-targets a weak match (null = create as new project).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { reviewSignal } from '@/lib/infra-intel/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const schema = z.object({
  action: z.enum(['approve', 'reject', 'revert']),
  note: z.string().max(500).optional(),
  projectId: z.string().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  try {
    const result = await reviewSignal(id, parsed.data.action, auth.userId, { note: parsed.data.note, projectId: parsed.data.projectId });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
