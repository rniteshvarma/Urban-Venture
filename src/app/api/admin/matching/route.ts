import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const leadId = searchParams.get("leadId") || undefined;
    const minScore = searchParams.get("minScore") ? parseInt(searchParams.get("minScore")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const where: any = {
      isDismissed: false,
    };

    if (projectId) where.projectId = projectId;
    if (leadId) where.leadId = leadId;
    if (minScore !== undefined) {
      where.matchScore = { gte: minScore };
    }

    const matches = await prisma.projectLeadMatch.findMany({
      where,
      include: {
        project: true,
        lead: true,
      },
      orderBy: {
        matchScore: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error("Error in GET /api/admin/matching:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
