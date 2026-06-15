import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { MilestoneStatus } from "@prisma/client";

const milestoneSchema = z.object({
  title: z.string().min(1),
  date: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  status: z.nativeEnum(MilestoneStatus).default("UPCOMING"),
  description: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
});

// POST /api/admin/infra-projects/[id]/milestones - Add milestone
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await req.json();
    const parse = milestoneSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const milestone = await prisma.infraMilestone.create({
      data: {
        ...parse.data,
        projectId: id
      }
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    console.error("Error in POST /api/admin/infra-projects/[id]/milestones:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/infra-projects/[id]/milestones - Clear all milestones (helper)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    await prisma.infraMilestone.deleteMany({
      where: { projectId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE milestones:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
