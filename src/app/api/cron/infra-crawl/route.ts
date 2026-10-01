/**
 * GET /api/cron/infra-crawl — daily. Crawls every source that is due by its
 * cadence (news daily, official/AI checks weekly), rescoring affected
 * corridors; on Mondays (IST) it also emails the weekly infra digest.
 * Protected with CRON_SECRET (assertCron fails closed in production).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { assertCron } from '@/lib/cron-auth';
import { runScheduled } from '@/lib/infra-intel/pipeline';
import { sendWeeklyDigest } from '@/lib/infra-intel/digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const result = await runScheduled(250_000);
    const istDay = new Date(Date.now() + 5.5 * 3600000).getUTCDay();
    const digest = istDay === 1 || req.nextUrl.searchParams.get('digest') === '1' ? await sendWeeklyDigest() : null;
    return NextResponse.json({ ok: true, ...result, digest });
  } catch (error) {
    console.error('cron infra-crawl', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
