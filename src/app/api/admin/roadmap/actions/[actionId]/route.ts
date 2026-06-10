import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/admin/roadmap/actions/[actionId] - Toggle or update action item
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const { actionId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { completed, title, dueDate } = body;

    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionId }
    });

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }
    if (title !== undefined) {
      updateData.title = title;
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const updated = await prisma.actionItem.update({
      where: { id: actionId },
      data: updateData
    });

    return NextResponse.json({ success: true, actionItem: updated });
  } catch (error: any) {
    console.error(`Error in PUT /api/admin/roadmap/actions/${actionId}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/roadmap/actions/[actionId] - Delete custom action item
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const { actionId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionId }
    });

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    await prisma.actionItem.delete({
      where: { id: actionId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in DELETE /api/admin/roadmap/actions/${actionId}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
