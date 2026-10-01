/**
 * POST /api/news/refresh { city } — pull the latest stories for a city now.
 * Public (the /news page calls it on load) but server-throttled per city
 * (see lib/news/refresh.ts), so it cannot be used to hammer publishers.
 */
import { NextResponse } from 'next/server';
import { refreshCityIfStale } from '@/lib/news/refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { city?: string };
  const city = typeof body.city === 'string' && /^[a-z0-9-]{2,40}$/.test(body.city) ? body.city : 'india';
  try {
    return NextResponse.json(await refreshCityIfStale(city));
  } catch (error) {
    console.error('POST /api/news/refresh', error);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
