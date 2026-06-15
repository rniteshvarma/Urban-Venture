import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/infrastructure - All published infra projects (for the landing map)
export async function GET(req: Request) {
  try {
    const projects = await prisma.infraProject.findMany({
      where: {
        isPublished: true
      },
      include: {
        milestones: {
          orderBy: { date: "asc" }
        }
      },
      orderBy: {
        reImpactScore: "desc"
      }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error in GET /api/market/infrastructure:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
