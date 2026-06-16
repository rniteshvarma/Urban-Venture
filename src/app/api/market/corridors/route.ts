import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors - Public list of all corridors with their intelligence scores and metrics
export async function GET(req: Request) {
  try {
    const corridors = await prisma.corridorProfile.findMany({
      where: { isPublished: true }
    });

    // Format response to look exactly like the old combined JSON for backward compatibility
    const response = corridors.map(c => ({
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
      projectedCAGRMin: c.projectedCAGRMin,
      projectedCAGRMax: c.projectedCAGRMax,
      rentalYieldMin: c.rentalYieldMin,
      rentalYieldMax: c.rentalYieldMax,
      riskLevel: c.riskLevel,
      overallScore: c.overallScore || 0,
      infraScore: c.infraScore || 0,
      approvalScore: c.approvalScore || 0,
      demandScore: c.demandScore || 0,
      appreciationScore: c.appreciationScore || 0,
      investorSentiment: c.sentiment || "NEUTRAL",
      adminNote: c.adminNote || "",
      keyDrivers: c.keyDrivers || [],
      keyRisks: c.keyRisks || [],
      bestFor: c.bestFor || [],
      lastComputedAt: c.updatedAt
    }));

    // Sort by overallScore descending
    response.sort((a, b) => b.overallScore - a.overallScore);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

