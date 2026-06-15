import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const overrideSchema = z.object({
  investorSentiment: z.enum(["BULLISH", "NEUTRAL", "CAUTIOUS"]).optional(),
  adminNote: z.string().optional().nullable(),
  keyDrivers: z.array(z.string()).optional(),
  keyRisks: z.array(z.string()).optional(),
  bestFor: z.array(z.string()).optional(),
});

// PUT /api/admin/intelligence/[corridor]/override - Admin override score commentary/drivers
export async function PUT(req: Request, { params }: { params: Promise<{ corridor: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { corridor } = await params;
    const decodedCorridor = decodeURIComponent(corridor);

    const body = await req.json();
    const parse = overrideSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const existing = await prisma.corridorIntelligence.findUnique({
      where: { corridor: decodedCorridor }
    });

    if (!existing) {
      return NextResponse.json({ error: "Corridor intelligence record not found. Compute score first." }, { status: 404 });
    }

    const updated = await prisma.corridorIntelligence.update({
      where: { corridor: decodedCorridor },
      data: {
        investorSentiment: parse.data.investorSentiment || existing.investorSentiment,
        adminNote: parse.data.adminNote !== undefined ? parse.data.adminNote : existing.adminNote,
        keyDrivers: parse.data.keyDrivers || existing.keyDrivers,
        keyRisks: parse.data.keyRisks || existing.keyRisks,
        bestFor: parse.data.bestFor || existing.bestFor,
      }
    });

    return NextResponse.json({ success: true, intelligence: updated });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/intelligence/[corridor]/override:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
