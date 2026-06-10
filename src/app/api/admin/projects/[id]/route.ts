import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  developer: z.string().min(1).optional(),
  corridor: z.string().min(1).optional(),
  city: z.string().optional(),
  minBudgetLakhs: z.number().positive().optional(),
  maxBudgetLakhs: z.number().positive().optional(),
  minHorizonYears: z.number().int().positive().optional(),
  maxHorizonYears: z.number().int().positive().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  propertyType: z.string().min(1).optional(),
  infraHighlights: z.array(z.string()).optional(),
  exitOpportunities: z.array(z.string()).optional(),
  comparables: z.array(z.string()).optional(),
  description: z.string().min(1).optional(),
  brochureUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "SOLD_OUT", "UPCOMING", "ARCHIVED"]).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = projectUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const currentProject = await prisma.project.findUnique({ where: { id } });
    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: parse.data
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: any) {
    console.error(`Error in PUT /api/admin/projects/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentProject = await prisma.project.findUnique({ where: { id } });
    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Soft delete / archive project
    const archivedProject = await prisma.project.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return NextResponse.json({ success: true, project: archivedProject });
  } catch (error: any) {
    console.error(`Error in DELETE /api/admin/projects/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
