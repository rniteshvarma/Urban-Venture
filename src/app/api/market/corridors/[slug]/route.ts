import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors/[slug] - Single corridor profile overview
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    // Find metric by corridor name (case-insensitive)
    const metric = await prisma.corridorMetrics.findFirst({
      where: {
        corridor: {
          equals: decodedSlug,
          mode: "insensitive"
        }
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const intel = await prisma.corridorIntelligence.findFirst({
      where: {
        corridor: {
          equals: metric.corridor,
          mode: "insensitive"
        }
      }
    });

    return NextResponse.json({
      corridor: metric.corridor,
      city: metric.city,
      historicalCAGR: metric.historicalCAGR,
      projectedCAGRMin: metric.projectedCAGRMin,
      projectedCAGRMax: metric.projectedCAGRMax,
      rentalYieldMin: metric.rentalYieldMin,
      rentalYieldMax: metric.rentalYieldMax,
      riskLevel: metric.riskLevel,
      overallScore: intel?.overallScore || 0,
      infraScore: intel?.infraScore || 0,
      approvalScore: intel?.approvalScore || 0,
      demandScore: intel?.demandScore || 0,
      appreciationScore: intel?.appreciationScore || 0,
      investorSentiment: intel?.investorSentiment || "NEUTRAL",
      adminNote: intel?.adminNote || "",
      keyDrivers: intel?.keyDrivers || [],
      keyRisks: intel?.keyRisks || [],
      bestFor: intel?.bestFor || [],
      lastComputedAt: intel?.lastComputedAt || null
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
