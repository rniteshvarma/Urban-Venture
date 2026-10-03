import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lookupPlace } from "@/lib/infra-intel/geo";

// GET /api/market/corridors - Public list of all corridors with their intelligence scores and metrics
export async function GET(req: Request) {
  try {
    const corridors = await prisma.corridorProfile.findMany({ where: { isPublished: true } });

    // Every number comes from the stored, measured values (src/lib/market/compute.ts);
    // a missing value stays missing rather than falling back to a hand-typed one.
    const response = corridors.map((c: any) => {
      const overallScore = c.overallScore ?? null;
      const infraScore = c.infraScore ?? null;
      const approvalScore = c.approvalScore ?? null;
      const demandScore = c.demandScore ?? null;
      const appreciationScore = c.appreciationScore ?? null;
      const investorSentiment = c.sentiment ?? null;
      const keyDrivers = c.keyDrivers ?? [];
      const projectedCAGRMin = c.projectedCAGRMin ?? null;
      const projectedCAGRMax = c.projectedCAGRMax ?? null;

      // Where the corridor is: stored centroid, else the gazetteer location of its short name.
      const place = c.centroidLat == null ? lookupPlace(c.shortName ?? c.name) : null;
      const centroidLat: number | null = c.centroidLat ?? place?.lat ?? null;
      const centroidLng: number | null = c.centroidLng ?? place?.lng ?? null;

      return {
        corridor: c.slug, // Maintain "corridor" as the slug for routing / queries
        centroidLat,
        centroidLng,
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
        lastComputedAt: c.marketComputedAt ?? c.updatedAt,
        market: c.marketStats ?? null,
      };
    });

    // Sort by overallScore descending
    response.sort((a: any, b: any) => (b.overallScore ?? -1) - (a.overallScore ?? -1));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
