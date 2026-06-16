import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors/[slug] - Single corridor profile overview
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    // Find by slug, name, or shortName (case-insensitive)
    const corridor = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } }
        ]
      }
    });

    if (!corridor) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    return NextResponse.json({
      corridor: corridor.slug, // Maintain key compatibility
      name: corridor.name,
      shortName: corridor.shortName,
      direction: corridor.direction,
      zone: corridor.zone,
      district: corridor.district,
      description: corridor.description,
      heatRating: corridor.heatRating,
      investmentCycle: corridor.investmentCycle,
      ghmc2025: corridor.ghmc2025,
      hmdaJurisdiction: corridor.hmdaJurisdiction,
      fcdaZone: corridor.fcdaZone,
      rrrAlignment: corridor.rrrAlignment,
      plotPriceMinSqYd: corridor.plotPriceMinSqYd,
      plotPriceMidSqYd: corridor.plotPriceMidSqYd,
      plotPriceMaxSqYd: corridor.plotPriceMaxSqYd,
      aptPriceMinSqFt: corridor.aptPriceMinSqFt,
      aptPriceMaxSqFt: corridor.aptPriceMaxSqFt,
      price2020SqYd: corridor.price2020SqYd,
      price2022SqYd: corridor.price2022SqYd,
      price2024SqYd: corridor.price2024SqYd,
      price2026SqYd: corridor.price2026SqYd,
      appreciationSince2020: corridor.appreciationSince2020,
      historicalCAGR: corridor.historicalCAGR,
      projectedCAGRMin: corridor.projectedCAGRMin,
      projectedCAGRMax: corridor.projectedCAGRMax,
      rentalYieldMin: corridor.rentalYieldMin,
      rentalYieldMax: corridor.rentalYieldMax,
      riskLevel: corridor.riskLevel,
      overallScore: corridor.overallScore || 0,
      infraScore: corridor.infraScore || 0,
      approvalScore: corridor.approvalScore || 0,
      demandScore: corridor.demandScore || 0,
      appreciationScore: corridor.appreciationScore || 0,
      investorSentiment: corridor.sentiment || "NEUTRAL",
      adminNote: corridor.adminNote || "",
      keyDrivers: corridor.keyDrivers || [],
      keyRisks: corridor.keyRisks || [],
      bestFor: corridor.bestFor || [],
      subAreas: corridor.subAreas || [],
      forecast3yrMin: corridor.forecast3yrMin,
      forecast3yrMax: corridor.forecast3yrMax,
      forecast5yrMin: corridor.forecast5yrMin,
      forecast5yrMax: corridor.forecast5yrMax,
      forecast10yrMin: corridor.forecast10yrMin,
      forecast10yrMax: corridor.forecast10yrMax,
      priceIndex2031: corridor.priceIndex2031,
      lastComputedAt: corridor.updatedAt
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

