import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initLeadRoadmap } from "@/lib/roadmap";

// GET /api/admin/leads/[id]/roadmap - Get lead roadmap, stages, and checklist
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

    const roadmap = await prisma.leadRoadmap.findUnique({
      where: { leadId: id },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            actionItems: {
              orderBy: { id: "asc" }
            }
          }
        },
        lead: true
      }
    });

    if (!roadmap) {
      return NextResponse.json({ initialized: false });
    }

    return NextResponse.json({ initialized: true, roadmap });
  } catch (error: any) {
    console.error(`Error in GET /api/admin/leads/${id}/roadmap:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/admin/leads/[id]/roadmap - Manually initialize closure roadmap
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roadmap = await initLeadRoadmap(id);
    if (!roadmap) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, roadmap });
  } catch (error: any) {
    console.error(`Error in POST /api/admin/leads/${id}/roadmap:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
