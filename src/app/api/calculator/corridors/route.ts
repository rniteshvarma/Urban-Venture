import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const corridors = await prisma.corridorProfile.findMany({
      where: { isPublished: true },
      orderBy: { name: "asc" }
    });

    const formatted = corridors.map(c => ({
      id: c.id,
      corridor: c.slug, // Maintain key compatibility
      name: c.name,
      shortName: c.shortName,
      historicalCAGR: c.historicalCAGR,
      projectedCAGRMin: c.projectedCAGRMin,
      projectedCAGRMax: c.projectedCAGRMax,
      rentalYieldMin: c.rentalYieldMin,
      rentalYieldMax: c.rentalYieldMax,
      riskLevel: c.riskLevel,
      overallScore: c.overallScore || 0
    }));

    return NextResponse.json({ success: true, corridors: formatted });
  } catch (error: any) {
    console.error("Error in GET /api/calculator/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
