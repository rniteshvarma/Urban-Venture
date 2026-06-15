import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { InfraCategory, InfraStatus } from "@prisma/client";

const projectSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  category: z.nativeEnum(InfraCategory),
  subCategory: z.string().optional().nullable(),
  description: z.string().min(1),
  status: z.nativeEnum(InfraStatus),
  completionPct: z.number().int().min(0).max(100).default(0),
  estimatedCompletion: z.string().optional().nullable(),
  totalInvestmentCr: z.number().positive().optional().nullable(),
  expectedJobs: z.number().int().positive().optional().nullable(),
  affectedCorridors: z.array(z.string()).default([]),
  impactRadius: z.number().min(1).max(50).default(10),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  sourceGO: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  approvalAuthority: z.string().optional().nullable(),
  reImpactScore: z.number().int().min(1).max(10).default(5),
  isPublished: z.boolean().default(false),
});

// GET /api/admin/infra-projects/[id] - Read single project
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const project = await prisma.infraProject.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { date: "asc" }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error in GET /api/admin/infra-projects/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// PUT /api/admin/infra-projects/[id] - Update single project
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await req.json();
    const parse = projectSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const updated = await prisma.infraProject.update({
      where: { id },
      data: parse.data
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/infra-projects/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/infra-projects/[id] - Delete project (cascades milestones)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    await prisma.infraProject.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/infra-projects/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
