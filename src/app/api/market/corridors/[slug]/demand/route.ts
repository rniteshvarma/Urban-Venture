import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { CorridorMarketStats } from "@/lib/market/compute";

// GET /api/market/corridors/[slug]/demand — developer activity measured from
// our listings, plus any recorded monthly demand rows. Nothing is defaulted:
// figures we don't have are returned as null.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const metric = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } },
        ],
      },
      select: { slug: true, name: true, shortName: true, marketStats: true, marketComputedAt: true },
    });
    if (!metric) return NextResponse.json({ error: "Corridor not found" }, { status: 404 });

    const trends = await prisma.demandTrend.findMany({
      where: { corridor: { equals: metric.slug, mode: "insensitive" } },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const m = metric.marketStats as unknown as CorridorMarketStats | null;
    const activity = m?.counts ?? null;
    const label = metric.shortName || metric.name;
    const contextParagraph = activity
      ? `We track ${activity.totalProjects} project${activity.totalProjects === 1 ? "" : "s"} within ${activity.radiusKm} km of ${label}: ${activity.activeProjects} under construction, ${activity.readyProjects} ready to move, and ${activity.reraProjects} registered with TG-RERA. Sales and enquiry volumes per area aren't published, so we don't estimate them.`
      : null;

    return NextResponse.json({
      corridor: metric.slug,
      trends,
      activity,
      contextParagraph,
      computedAt: metric.marketComputedAt,
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/demand:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
