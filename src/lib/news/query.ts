/**
 * Suppression-safe feed query helper (News module spec, Part 9).
 *
 * EVERY read route must exclude suppressed articles and blocked sources. Routing
 * all feed reads through buildFeedWhere() makes that impossible to forget — a
 * takedown (suppressedAt set) or a blocked source disappears from every feed.
 */

import type { Prisma } from '@prisma/client';
import prisma from '../prisma';

export async function buildFeedWhere(
  extra: Prisma.NewsArticleWhereInput = {},
): Promise<Prisma.NewsArticleWhereInput> {
  const blocked = await prisma.newsSource.findMany({
    where: { isBlocked: true },
    select: { name: true },
  });

  const base: Prisma.NewsArticleWhereInput = {
    isPublished: true,
    suppressedAt: null,
  };
  if (blocked.length > 0) {
    base.sourceName = { notIn: blocked.map((b) => b.name) };
  }

  return { AND: [base, extra] };
}
