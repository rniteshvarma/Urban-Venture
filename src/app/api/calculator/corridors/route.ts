import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const corridors = await prisma.corridorMetrics.findMany({
      orderBy: { corridor: "asc" }
    });
    const intelligence = await prisma.corridorIntelligence.findMany();

    const merged = corridors.map(c => {
      const intel = intelligence.find(i => i.corridor.toLowerCase() === c.corridor.toLowerCase());
      return {
        ...c,
        overallScore: intel?.overallScore || 0
      };
    });

    return NextResponse.json({ success: true, corridors: merged });
  } catch (error: any) {
    console.error("Error in GET /api/calculator/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
