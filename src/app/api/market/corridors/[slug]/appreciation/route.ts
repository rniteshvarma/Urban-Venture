import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CITY } from "@/lib/market/anchors";

// GET /api/market/corridors/[slug]/appreciation - Fetch price history for a corridor
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    // Resolve case-sensitive name first from CorridorProfile
    const metric = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } }
        ]
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const pricePoints = await prisma.appreciationHistory.findMany({
      where: {
        corridor: { equals: metric.slug, mode: "insensitive" }
      },
      orderBy: [
        { year: "asc" },
        { quarter: "asc" }
      ]
    });

    // Only recorded observations — no history is ever synthesised. City figures
    // are the published ones (src/lib/market/anchors.ts), with their sources.
    const city = [CITY.price2019SqFt, CITY.priceQ2_2026SqFt, CITY.avgPriceSqFt];

    return NextResponse.json({
      corridor: metric.slug,
      pricePoints,
      hyderabadAverages: [],
      cityBenchmarks: city.map((f) => ({ period: f.period, pricePerSqFt: f.value, source: f.source, url: f.url })),
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/appreciation:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
