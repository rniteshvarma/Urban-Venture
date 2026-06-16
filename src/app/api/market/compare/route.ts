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

    // Resolve case-insensitive names and retrieve profiles
    const profiles = await prisma.corridorProfile.findMany({
      where: {
        OR: [
          { slug: { in: corridorNames, mode: "insensitive" } },
          { name: { in: corridorNames, mode: "insensitive" } },
          { shortName: { in: corridorNames, mode: "insensitive" } }
        ]
      }
    });

    const resolvedSlugs = profiles.map(p => p.slug);

    const priceHistories = await prisma.appreciationHistory.findMany({
      where: {
        corridor: {
          in: resolvedSlugs
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
    const comparisons = profiles.map(profile => {
      const history = priceHistories.filter(h => h.corridor.toLowerCase() === profile.slug.toLowerCase());
      const affectingProjects = infraProjects.filter(ip => 
        ip.affectedCorridorSlugs.some(ac => ac.toLowerCase() === profile.slug.toLowerCase()) ||
        ip.affectedCorridors.some(ac => ac.toLowerCase() === profile.name.toLowerCase())
      );

      return {
        corridor: profile.slug, // Keep key compatible
        name: profile.name,
        shortName: profile.shortName,
        direction: profile.direction,
        zone: profile.zone,
        district: profile.district,
        description: profile.description,
        heatRating: profile.heatRating,
        investmentCycle: profile.investmentCycle,
        historicalCAGR: profile.historicalCAGR,
        projectedCAGRMin: profile.projectedCAGRMin,
        projectedCAGRMax: profile.projectedCAGRMax,
        rentalYieldMin: profile.rentalYieldMin,
        rentalYieldMax: profile.rentalYieldMax,
        riskLevel: profile.riskLevel,
        overallScore: profile.overallScore || 0,
        infraScore: profile.infraScore || 0,
        approvalScore: profile.approvalScore || 0,
        demandScore: profile.demandScore || 0,
        appreciationScore: profile.appreciationScore || 0,
        investorSentiment: profile.sentiment || "NEUTRAL",
        adminNote: profile.adminNote || "",
        keyDrivers: profile.keyDrivers || [],
        keyRisks: profile.keyRisks || [],
        bestFor: profile.bestFor || [],
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
