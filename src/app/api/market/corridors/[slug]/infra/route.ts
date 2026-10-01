import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { scoreMovement } from "@/lib/infra-intel/rescore";

// GET /api/market/corridors/[slug]/infra - Fetch infrastructure projects affecting a corridor
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const metric = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } }
        ]
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const projects = await prisma.infraProject.findMany({
      where: {
        OR: [
          { affectedCorridorSlugs: { has: metric.slug } },
          { affectedCorridors: { has: metric.slug } },
          { affectedCorridors: { has: metric.name } },
          { affectedCorridors: { has: metric.shortName } }
        ],
        isPublished: true
      },
      include: {
        milestones: {
          orderBy: { date: "asc" }
        }
      },
      orderBy: {
        reImpactScore: "desc"
      }
    });

    // Why the infra score is what it is (+ change since the previous rescore),
    // and how fresh the underlying project data is.
    const movement = await scoreMovement(metric.slug);
    const lastUpdated = projects.reduce<Date | null>((latest, p) => {
      const d = p.lastVerifiedDate;
      return d && (!latest || d > latest) ? d : latest;
    }, null);

    return NextResponse.json({
      corridor: metric.slug,
      projects,
      movement,
      lastUpdated,
      // Computed here so the page doesn't read the clock during render.
      lastUpdatedDaysAgo: lastUpdated ? Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 86400000)) : null
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/infra:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
