import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

/** DELETE — remove a saved project (scoped to the owner). `id` is the SavedProject id OR projectId. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // Accept either the SavedProject id or the projectId — always scoped to userId.
  await prisma.savedProject.deleteMany({ where: { userId, OR: [{ id }, { projectId: id }] } });
  return NextResponse.json({ success: true });
}

/** PUT { note } — update the inline note on a saved project. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { note } = await req.json();
  await prisma.savedProject.updateMany({ where: { userId, OR: [{ id }, { projectId: id }] }, data: { note: note || null } });
  return NextResponse.json({ success: true });
}
