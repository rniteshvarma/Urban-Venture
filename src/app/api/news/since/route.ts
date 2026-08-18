/** GET /api/news/since?ts=&city= — new items only, for the 60s poll (spec Part 7.4). */
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { buildFeedWhere } from '@/lib/news/query';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const city = q.get('city') || 'india';
    const tsRaw = q.get('ts');
    const since = tsRaw ? new Date(Number.isNaN(Number(tsRaw)) ? tsRaw : Number(tsRaw)) : new Date(Date.now() - 3600_000);

    const where = await buildFeedWhere({ cityScope: city, ingestedAt: { gt: since } });
    const articles = await prisma.newsArticle.findMany({ where, orderBy: { publishedAt: 'desc' }, take: 30 });
    return NextResponse.json({ articles, count: articles.length, serverTime: Date.now() });
  } catch (error) {
    console.error('GET /api/news/since', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
