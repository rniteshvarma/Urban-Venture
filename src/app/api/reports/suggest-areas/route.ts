// POST /api/reports/suggest-areas { budgetMinLakh?, budgetMaxLakh?, city? }
// → the top 3 affordable, high-scoring corridors for the budget.
//
// The spec assumed an existing LandIQ "where-to-buy" endpoint; there isn't one,
// so this derives suggestions from CorridorProfile: affordable (a typical plot
// fits the budget) ranked by overallScore. It removes the blank-slate problem
// for users who don't know which corridors to pick.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

// A representative entry plot used to turn a per-sq.yd rate into a total price.
const TYPICAL_PLOT_SQYD = 167; // ~150–200 sq.yd is the common entry plot

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const budgetMaxLakh = body.budgetMaxLakh != null ? Number(body.budgetMaxLakh) : null;
  const budgetMinLakh = body.budgetMinLakh != null ? Number(body.budgetMinLakh) : null;
  const city = typeof body.city === "string" ? body.city : undefined;

  const corridors = await prisma.corridorProfile.findMany({
    where: { isPublished: true, ...(city ? { city } : {}) },
    select: { slug: true, name: true, shortName: true, overallScore: true, plotPriceMidSqYd: true },
  });

  const scored = corridors.map((c) => {
    const entryLakh = c.plotPriceMidSqYd != null ? Math.round((c.plotPriceMidSqYd * TYPICAL_PLOT_SQYD) / 100000) : null;
    let affordable = true;
    if (budgetMaxLakh != null && entryLakh != null) affordable = entryLakh <= budgetMaxLakh * 1.1;
    return { ...c, entryLakh, affordable };
  });

  const suggestions = scored
    .filter((c) => c.affordable)
    // Prefer areas whose entry sits inside the stated range, then by score.
    .sort((a, b) => {
      const aIn = budgetMinLakh != null && a.entryLakh != null && a.entryLakh >= budgetMinLakh * 0.6 ? 1 : 0;
      const bIn = budgetMinLakh != null && b.entryLakh != null && b.entryLakh >= budgetMinLakh * 0.6 ? 1 : 0;
      if (aIn !== bIn) return bIn - aIn;
      return (b.overallScore ?? 0) - (a.overallScore ?? 0);
    })
    .slice(0, 3)
    .map((c) => ({ slug: c.slug, name: c.name, shortName: c.shortName, score: c.overallScore, approxEntryLakh: c.entryLakh }));

  return NextResponse.json({ suggestions });
}
