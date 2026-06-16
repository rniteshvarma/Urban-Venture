import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const risks = await prisma.legalRisk.findMany({
      where: { isActive: true },
      orderBy: { severity: "asc" }
    });
    return NextResponse.json({ success: true, risks });
  } catch (error: any) {
    console.error("Error in GET /api/market/legal:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
