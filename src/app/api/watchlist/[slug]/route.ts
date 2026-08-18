import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

/** DELETE — stop watching a corridor (scoped to the owner). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  await prisma.corridorWatch.deleteMany({ where: { userId, corridorSlug: slug } });
  return NextResponse.json({ success: true });
}
