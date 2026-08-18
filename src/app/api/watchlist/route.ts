import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { pushAnonActivity } from "@/lib/anon-session";

function currentPrice(cp: { plotPriceMidSqYd: number | null; plotPriceMinSqYd: number | null } | null): number | null {
  return cp?.plotPriceMidSqYd ?? cp?.plotPriceMinSqYd ?? null;
}

/** GET — watched corridors with "since you watched" price/score deltas. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ items: [] });

  const watches = await prisma.corridorWatch.findMany({ where: { userId }, orderBy: { watchedAt: "desc" } });
  const items = await Promise.all(
    watches.map(async (w) => {
      const cp = await prisma.corridorProfile.findUnique({
        where: { slug: w.corridorSlug },
        select: { name: true, plotPriceMidSqYd: true, plotPriceMinSqYd: true, overallScore: true },
      });
      const priceNow = currentPrice(cp);
      const scoreNow = cp?.overallScore ?? null;
      const priceDeltaPct =
        w.priceAtWatchSqYd && priceNow ? ((priceNow - w.priceAtWatchSqYd) / w.priceAtWatchSqYd) * 100 : null;
      const scoreDelta = w.scoreAtWatch != null && scoreNow != null ? scoreNow - w.scoreAtWatch : null;
      return {
        slug: w.corridorSlug,
        name: cp?.name ?? w.corridorSlug,
        watchedAt: w.watchedAt,
        priceAtWatch: w.priceAtWatchSqYd,
        priceNow,
        priceDeltaPct,
        scoreAtWatch: w.scoreAtWatch,
        scoreNow,
        scoreDelta,
      };
    })
  );
  return NextResponse.json({ items });
}

/** POST { corridorSlug } — watch a corridor, snapshotting current price + score. */
export async function POST(req: Request) {
  const { corridorSlug } = await req.json();
  if (!corridorSlug) return NextResponse.json({ error: "corridorSlug required" }, { status: 400 });

  const userId = await getSessionUserId();
  if (!userId) {
    await pushAnonActivity("watchedCorridors", corridorSlug);
    return NextResponse.json({ watching: true, anonymous: true });
  }

  const existing = await prisma.corridorWatch.findUnique({ where: { userId_corridorSlug: { userId, corridorSlug } } });
  if (existing) return NextResponse.json({ watching: true, anonymous: false, id: existing.id });

  const cp = await prisma.corridorProfile.findUnique({
    where: { slug: corridorSlug },
    select: { plotPriceMidSqYd: true, plotPriceMinSqYd: true, overallScore: true },
  });
  const item = await prisma.corridorWatch.create({
    data: {
      userId,
      corridorSlug,
      priceAtWatchSqYd: currentPrice(cp),
      scoreAtWatch: cp?.overallScore ?? null,
    },
  });
  return NextResponse.json({ watching: true, anonymous: false, id: item.id });
}
