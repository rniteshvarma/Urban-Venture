/**
 * GET /api/geo/resolve?name=&district=&mandal=&source=&asOf=&lgd=&lat=&lng=
 *
 * Public resolution endpoint (AGENTS.md geo spec, Part 6). Read-only: runs the
 * resolver with persistence OFF so a lookup never writes aliases or queue rows.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { resolveVillage } from '@/lib/geo/resolver';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const name = q.get('name');
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const lat = q.get('lat');
    const lng = q.get('lng');
    const asOf = q.get('asOf');

    const result = await resolveVillage(
      {
        source: q.get('source') || 'API',
        rawName: name,
        rawDistrict: q.get('district'),
        rawMandal: q.get('mandal'),
        lgdCode: q.get('lgd'),
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        asOfDate: asOf ? new Date(asOf) : undefined,
      },
      { persist: false },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/geo/resolve:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
