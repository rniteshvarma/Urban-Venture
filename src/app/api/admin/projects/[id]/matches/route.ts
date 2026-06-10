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

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Auto-match algorithm:
    // Finds leads where lead.budget is within project's budget range AND lead.horizon is within project's horizon range.
    // Also matching by city.
    const matchedLeads = await prisma.lead.findMany({
      where: {
        city: { equals: project.city, mode: "insensitive" },
        budget: {
          gte: project.minBudgetLakhs,
          lte: project.maxBudgetLakhs,
        },
        horizon: {
          gte: project.minHorizonYears,
          lte: project.maxHorizonYears,
        }
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: true
      }
    });

    return NextResponse.json(matchedLeads);
  } catch (error: any) {
    console.error(`Error matching leads for project ${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
