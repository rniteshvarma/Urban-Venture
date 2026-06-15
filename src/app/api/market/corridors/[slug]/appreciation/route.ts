import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors/[slug]/appreciation - Fetch price history for a corridor
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    // Resolve case-sensitive name first from metrics
    const metric = await prisma.corridorMetrics.findFirst({
      where: {
        corridor: { equals: decodedSlug, mode: "insensitive" }
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const pricePoints = await prisma.appreciationHistory.findMany({
      where: {
        corridor: { equals: metric.corridor, mode: "insensitive" }
      },
      orderBy: [
        { year: "asc" },
        { quarter: "asc" }
      ]
    });

    // Also calculate standard benchmarks (average Hyderabad prices per year for comparison)
    const allPricePoints = await prisma.appreciationHistory.findMany({
      orderBy: { year: "asc" }
    });

    // Compute Hyderabad averages per year
    const years = Array.from(new Set(allPricePoints.map(p => p.year)));
    const hyderabadAverages = years.map(y => {
      const yearPoints = allPricePoints.filter(p => p.year === y);
      const avg = yearPoints.reduce((sum, p) => sum + p.pricePerSqFt, 0) / yearPoints.length;
      const avgYoY = yearPoints.reduce((sum, p) => sum + p.yoyChange, 0) / yearPoints.length;
      return {
        year: y,
        pricePerSqFt: Math.round(avg),
        yoyChange: parseFloat(avgYoY.toFixed(2))
      };
    });

    return NextResponse.json({
      corridor: metric.corridor,
      pricePoints,
      hyderabadAverages
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/appreciation:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
