import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const corridors = await prisma.corridorMetrics.findMany({
      orderBy: { corridor: "asc" }
    });

    return NextResponse.json({ success: true, corridors });
  } catch (error: any) {
    console.error("Error in GET /api/calculator/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
