import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CORRIDOR_BASELINES: Record<string, {
  overallScore: number;
  infraScore: number;
  approvalScore: number;
  demandScore: number;
  appreciationScore: number;
  sentiment: "BULLISH" | "NEUTRAL" | "CAUTIOUS";
  projectedCAGRMin: number;
  projectedCAGRMax: number;
  keyDrivers: string[];
}> = {
  "kokapet-neopolis": {
    overallScore: 75,
    infraScore: 88,
    approvalScore: 82,
    demandScore: 90,
    appreciationScore: 85,
    sentiment: "BULLISH",
    projectedCAGRMin: 15,
    projectedCAGRMax: 22,
    keyDrivers: ["Neopolis IT SEZ expansion", "ORR Exit 1 high-speed connectivity", "High-density commercial high-rises"],
  },
  "adibatla": {
    overallScore: 78,
    infraScore: 82,
    approvalScore: 80,
    demandScore: 85,
    appreciationScore: 80,
    sentiment: "BULLISH",
    projectedCAGRMin: 12,
    projectedCAGRMax: 16,
    keyDrivers: ["Tata Aerospace & TCS Job Growth", "ORR Exit 12 Connectivity", "RRR Southern alignment proximity"],
  },
  "kadthal-fcda": {
    overallScore: 84,
    infraScore: 88,
    approvalScore: 82,
    demandScore: 90,
    appreciationScore: 88,
    sentiment: "BULLISH",
    projectedCAGRMin: 18,
    projectedCAGRMax: 24,
    keyDrivers: ["Future City Mega AI & Sports Hubs", "Metro Phase 2 Mucherla Extension", "Srisailam Highway 4-laning"],
  },
  "tukkuguda-shamshabad": {
    overallScore: 79,
    infraScore: 85,
    approvalScore: 78,
    demandScore: 80,
    appreciationScore: 82,
    sentiment: "BULLISH",
    projectedCAGRMin: 14,
    projectedCAGRMax: 18,
    keyDrivers: ["RGIA Expansion to 40M passengers", "Future City Metro link project", "Premium villa sanctuary belt"],
  },
  "maheshwaram-pharma-city": {
    overallScore: 76,
    infraScore: 80,
    approvalScore: 75,
    demandScore: 82,
    appreciationScore: 80,
    sentiment: "BULLISH",
    projectedCAGRMin: 15,
    projectedCAGRMax: 20,
    keyDrivers: ["Wipro & HCL SEZ Expansions", "Direct connectivity to Srisailam & Bangalore Highways", "Pharma City node proximity"],
  },
  "shadnagar": {
    overallScore: 73,
    infraScore: 80,
    approvalScore: 75,
    demandScore: 85,
    appreciationScore: 82,
    sentiment: "BULLISH",
    projectedCAGRMin: 11,
    projectedCAGRMax: 15,
    keyDrivers: ["NH-44 Hyderabad-Bangalore Industrial Corridor", "Upcoming RRR Intersection", "Affordable residential land banking"],
  },
  "shankarpally-mokila": {
    overallScore: 80,
    infraScore: 84,
    approvalScore: 80,
    demandScore: 86,
    appreciationScore: 82,
    sentiment: "BULLISH",
    projectedCAGRMin: 13,
    projectedCAGRMax: 17,
    keyDrivers: ["Proximity to Financial District (Gachibowli)", "Upcoming 100ft road expansion", "Premium gated villa haven"],
  },
  "sangareddy-industrial": {
    overallScore: 71,
    infraScore: 78,
    approvalScore: 72,
    demandScore: 75,
    appreciationScore: 76,
    sentiment: "NEUTRAL",
    projectedCAGRMin: 10,
    projectedCAGRMax: 14,
    keyDrivers: ["IIT Hyderabad tech anchor", "RRR Northern Arc interchange junction", "NH-65 Mumbai Highway logistics corridor"],
  },
  "kompally-bachupally": {
    overallScore: 72,
    infraScore: 76,
    approvalScore: 75,
    demandScore: 78,
    appreciationScore: 74,
    sentiment: "NEUTRAL",
    projectedCAGRMin: 10,
    projectedCAGRMax: 13,
    keyDrivers: ["NH-44 North residential growth", "Established lifestyle & healthcare infrastructure", "Flyover bottleneck resolutions"],
  },
  "medchal-dundigal": {
    overallScore: 74,
    infraScore: 80,
    approvalScore: 74,
    demandScore: 78,
    appreciationScore: 78,
    sentiment: "NEUTRAL",
    projectedCAGRMin: 11,
    projectedCAGRMax: 15,
    keyDrivers: ["NH-44 Warehousing & Logistics Hub", "Dundigal Aerospace & Defense SEZ", "RRR Northern junction connectivity"],
  },
  "ghatkesar-peerzadiguda": {
    overallScore: 68,
    infraScore: 72,
    approvalScore: 75,
    demandScore: 76,
    appreciationScore: 74,
    sentiment: "NEUTRAL",
    projectedCAGRMin: 9,
    projectedCAGRMax: 13,
    keyDrivers: ["Raheja Mindspace IT Park Pocharam", "AIIMS Bibinagar Medical Hub", "Warangal Highway NH-163 widening"],
  },
  "bibinagar-bhongir": {
    overallScore: 67,
    infraScore: 70,
    approvalScore: 70,
    demandScore: 72,
    appreciationScore: 74,
    sentiment: "NEUTRAL",
    projectedCAGRMin: 9,
    projectedCAGRMax: 12,
    keyDrivers: ["AIIMS Medical Hub expansion", "Yadadri Temple tourism corridor", "Budget long-term land banking"],
  },
};

// GET /api/market/corridors - Public list of all corridors with their intelligence scores and metrics
export async function GET(req: Request) {
  try {
    const corridors = await prisma.corridorProfile.findMany({
      where: { isPublished: true },
    });

    // Format response with calibrated baseline intelligence fallbacks
    const response = corridors.map((c: any) => {
      const baseline = CORRIDOR_BASELINES[c.slug] || {
        overallScore: 72,
        infraScore: 78,
        approvalScore: 75,
        demandScore: 78,
        appreciationScore: 76,
        sentiment: "BULLISH" as const,
        projectedCAGRMin: 12,
        projectedCAGRMax: 16,
        keyDrivers: ["Key highway connectivity improvements", "Expanding employment hubs", "Growing investor transaction volume"],
      };

      const overallScore = c.overallScore && c.overallScore > 0 ? c.overallScore : baseline.overallScore;
      const infraScore = c.infraScore && c.infraScore > 0 ? c.infraScore : baseline.infraScore;
      const approvalScore = c.approvalScore && c.approvalScore > 0 ? c.approvalScore : baseline.approvalScore;
      const demandScore = c.demandScore && c.demandScore > 0 ? c.demandScore : baseline.demandScore;
      const appreciationScore = c.appreciationScore && c.appreciationScore > 0 ? c.appreciationScore : baseline.appreciationScore;
      
      const investorSentiment =
        c.sentiment && c.sentiment !== "NEUTRAL"
          ? c.sentiment
          : overallScore >= 75
          ? "BULLISH"
          : overallScore < 50
          ? "CAUTIOUS"
          : baseline.sentiment;

      const keyDrivers = c.keyDrivers && c.keyDrivers.length > 0 ? c.keyDrivers : baseline.keyDrivers;
      const projectedCAGRMin = c.projectedCAGRMin && c.projectedCAGRMin > 0 ? c.projectedCAGRMin : baseline.projectedCAGRMin;
      const projectedCAGRMax = c.projectedCAGRMax && c.projectedCAGRMax > 0 ? c.projectedCAGRMax : baseline.projectedCAGRMax;

      return {
        corridor: c.slug, // Maintain "corridor" as the slug for routing / queries
        name: c.name,
        shortName: c.shortName,
        direction: c.direction,
        zone: c.zone,
        district: c.district,
        description: c.description,
        heatRating: c.heatRating,
        investmentCycle: c.investmentCycle,
        plotPriceMinSqYd: c.plotPriceMinSqYd,
        plotPriceMidSqYd: c.plotPriceMidSqYd,
        plotPriceMaxSqYd: c.plotPriceMaxSqYd,
        aptPriceMinSqFt: c.aptPriceMinSqFt,
        aptPriceMaxSqFt: c.aptPriceMaxSqFt,
        price2020SqYd: c.price2020SqYd,
        price2022SqYd: c.price2022SqYd,
        price2024SqYd: c.price2024SqYd,
        price2026SqYd: c.price2026SqYd,
        appreciationSince2020: c.appreciationSince2020,
        historicalCAGR: c.historicalCAGR,
        projectedCAGRMin,
        projectedCAGRMax,
        rentalYieldMin: c.rentalYieldMin,
        rentalYieldMax: c.rentalYieldMax,
        riskLevel: c.riskLevel,
        overallScore,
        infraScore,
        approvalScore,
        demandScore,
        appreciationScore,
        investorSentiment,
        adminNote: c.adminNote || "",
        keyDrivers,
        keyRisks: c.keyRisks || [],
        bestFor: c.bestFor || [],
        lastComputedAt: c.updatedAt,
      };
    });

    // Sort by overallScore descending
    response.sort((a: any, b: any) => b.overallScore - a.overallScore);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
