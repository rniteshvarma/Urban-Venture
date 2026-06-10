import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        leadScore: true,
        leadScoreGrade: true,
        leadScoreFactors: true,
        leadScoreUpdatedAt: true
      }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, factors: lead.leadScoreFactors, score: lead.leadScore, grade: lead.leadScoreGrade });
  } catch (error: any) {
    console.error(`Error in GET /api/admin/leads/${id}/score-factors:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
