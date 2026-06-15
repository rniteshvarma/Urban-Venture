import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors - Public list of all corridors with their intelligence scores and metrics
export async function GET(req: Request) {
  try {
    const metrics = await prisma.corridorMetrics.findMany();
    const intelligence = await prisma.corridorIntelligence.findMany();

    // Join them by corridor name
    const combined = metrics.map(metric => {
      const intel = intelligence.find(i => i.corridor.toLowerCase() === metric.corridor.toLowerCase());
      return {
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
      };
    });

    // Sort by overallScore descending
    combined.sort((a, b) => b.overallScore - a.overallScore);

    return NextResponse.json(combined);
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
