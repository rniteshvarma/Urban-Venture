/** GET /api/news/cities — active cities + article counts (spec Part 9). */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cities = await prisma.newsCity.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: { slug: true, name: true, stateCode: true, articleCount: true, lastIngestAt: true },
    });
    return NextResponse.json({ cities });
  } catch (error) {
    console.error('GET /api/news/cities', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
