/**
 * GET /api/cron/ingest-news — iterates active cities (spec Part 4.2).
 * Protected with CRON_SECRET. In mock mode it re-reads mock data, keeping the
 * pipeline exercised. Matches the existing cron auth pattern (Bearer token).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { ingestAllCities } from '@/lib/news/ingest';
import { assertCron } from "@/lib/cron-auth";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const runs = await ingestAllCities();
    return NextResponse.json({
      ok: true,
      runs: runs.map((r) => ({ city: r.cityScope, status: r.status, stored: r.stored, duplicates: r.duplicates })),
    });
  } catch (error) {
    console.error('cron ingest-news', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
