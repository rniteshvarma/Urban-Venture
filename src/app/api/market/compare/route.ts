import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/compare - Compare 2-3 corridors (e.g. ?a=shadnagar&b=pharma-city&c=sangareddy)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    const c = searchParams.get("c");

    if (!a || !b) {
      return NextResponse.json({ error: "At least two corridors (a and b) are required for comparison" }, { status: 400 });
    }

    const corridorNames = [a, b];
    if (c) corridorNames.push(c);

    // Resolve case-insensitive names and retrieve metrics
    const metrics = await prisma.corridorMetrics.findMany({
      where: {
        corridor: {
          in: corridorNames,
          mode: "insensitive"
        }
      }
    });

    const resolvedNames = metrics.map(m => m.corridor);

    const intelligence = await prisma.corridorIntelligence.findMany({
      where: {
        corridor: {
          in: resolvedNames
        }
      }
    });

    const priceHistories = await prisma.appreciationHistory.findMany({
      where: {
        corridor: {
          in: resolvedNames
        }
      },
      orderBy: [
        { year: "asc" },
        { quarter: "asc" }
      ]
    });

    const infraProjects = await prisma.infraProject.findMany({
      where: {
        isPublished: true
      }
    });

    // Assemble comparisons
    const comparisons = metrics.map(metric => {
      const intel = intelligence.find(i => i.corridor.toLowerCase() === metric.corridor.toLowerCase());
      const history = priceHistories.filter(h => h.corridor.toLowerCase() === metric.corridor.toLowerCase());
      const affectingProjects = infraProjects.filter(ip => 
        ip.affectedCorridors.some(ac => ac.toLowerCase() === metric.corridor.toLowerCase())
      );

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
        priceHistory: history,
        infraProjects: affectingProjects.map(p => ({
          name: p.name,
          shortName: p.shortName,
          category: p.category,
          status: p.status,
          reImpactScore: p.reImpactScore,
          completionPct: p.completionPct,
          estimatedCompletion: p.estimatedCompletion
        }))
      };
    });

    return NextResponse.json(comparisons);
  } catch (error: any) {
    console.error("Error in GET /api/market/compare:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
