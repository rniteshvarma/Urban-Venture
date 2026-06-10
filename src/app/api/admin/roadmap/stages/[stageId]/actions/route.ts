import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const { stageId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, dueDate } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required and must be a string" }, { status: 400 });
    }

    const stage = await prisma.roadmapStage.findUnique({
      where: { id: stageId }
    });

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const actionItem = await prisma.actionItem.create({
      data: {
        stageId,
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        completed: false
      }
    });

    return NextResponse.json({ success: true, actionItem });
  } catch (error: any) {
    console.error(`Error in POST /api/admin/roadmap/stages/${stageId}/actions:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
