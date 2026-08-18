/** GET /api/news?city=&category=&minImpact=&page=&sort= (News module spec, Part 9). */
import { NextResponse, type NextRequest } from 'next/server';
import type { NewsCategory, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { buildFeedWhere } from '@/lib/news/query';
import { ALL_CATEGORIES } from '@/lib/news/categories';

const PAGE_SIZE = 18;

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const city = q.get('city') || 'india';
    const categoryParam = q.get('category');
    const category = ALL_CATEGORIES.includes(categoryParam as NewsCategory) ? (categoryParam as NewsCategory) : null;
    const minImpact = Number(q.get('minImpact') || 0);
    const page = Math.max(1, Number(q.get('page') || 1));
    const sort = q.get('sort') === 'impact' ? 'impact' : 'latest';

    const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
      sort === 'impact'
        ? [{ isPinned: 'desc' }, { impactScore: 'desc' }, { publishedAt: 'desc' }]
        : [{ isPinned: 'desc' }, { publishedAt: 'desc' }];

    const where = await buildFeedWhere({
      cityScope: city,
      ...(category ? { category } : {}),
      ...(minImpact ? { impactScore: { gte: minImpact } } : {}),
    });

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.newsArticle.count({ where }),
    ]);

    return NextResponse.json({ articles, page, total, hasMore: page * PAGE_SIZE < total });
  } catch (error) {
    console.error('GET /api/news', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
