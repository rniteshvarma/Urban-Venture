import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

/** DELETE — remove a saved report (scoped to owner). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.savedReport.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}

/** PUT { isPinned } — pin/unpin a saved report. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { isPinned } = await req.json();
  await prisma.savedReport.updateMany({ where: { id, userId }, data: { isPinned: !!isPinned } });
  return NextResponse.json({ success: true });
}
