// GET /api/reports/areas?city= — the areas dropdown source for the preference
// form. Published CorridorProfile records, best score first, each with its live
// score so the choice feels informed (spec §2.2).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const city = new URL(req.url).searchParams.get("city");
  const rows = await prisma.corridorProfile.findMany({
    where: { isPublished: true, ...(city ? { city } : {}) },
    select: { slug: true, name: true, shortName: true, overallScore: true, plotPriceMidSqYd: true },
    orderBy: [{ overallScore: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    areas: rows.map((c) => ({ slug: c.slug, name: c.name, shortName: c.shortName, score: c.overallScore, midRateSqYd: c.plotPriceMidSqYd })),
  });
}
