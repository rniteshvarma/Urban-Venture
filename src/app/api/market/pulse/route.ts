import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const pulse = await prisma.marketPulse.findFirst({
      orderBy: { reportDate: "desc" }
    });
    return NextResponse.json({ success: true, pulse });
  } catch (error: any) {
    console.error("Error in GET /api/market/pulse:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
