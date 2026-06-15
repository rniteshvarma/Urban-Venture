import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors/[slug]/infra - Fetch infrastructure projects affecting a corridor
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const metric = await prisma.corridorMetrics.findFirst({
      where: {
        corridor: { equals: decodedSlug, mode: "insensitive" }
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const projects = await prisma.infraProject.findMany({
      where: {
        affectedCorridors: {
          has: metric.corridor
        },
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

    return NextResponse.json({
      corridor: metric.corridor,
      projects
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/infra:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
