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
      where: { id }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Auto-match algorithm:
    // Finds projects where lead.budget matches the project's budget range AND lead.horizon matches project's horizon range.
    // Also matching by city.
    const matchedProjects = await prisma.project.findMany({
      where: {
        city: { equals: lead.city, mode: "insensitive" },
        status: "ACTIVE",
        minBudgetLakhs: { lte: lead.budget },
        maxBudgetLakhs: { gte: lead.budget },
        minHorizonYears: { lte: lead.horizon },
        maxHorizonYears: { gte: lead.horizon },
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(matchedProjects);
  } catch (error: any) {
    console.error(`Error matching projects for lead ${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
