import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { pushAnonActivity } from "@/lib/anon-session";

/** GET — the signed-in user's saved projects (with project details). */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ items: [] });
  const items = await prisma.savedProject.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    include: { project: true },
  });
  return NextResponse.json({ items });
}

/** POST { projectId, note? } — save. Authenticated → SavedProject; anonymous → cookie session. */
export async function POST(req: Request) {
  const { projectId, note } = await req.json();
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const userId = await getSessionUserId();
  if (!userId) {
    await pushAnonActivity("savedProjectIds", projectId);
    return NextResponse.json({ saved: true, anonymous: true });
  }

  const item = await prisma.savedProject.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, note: note || null },
    update: note !== undefined ? { note } : {},
  });
  return NextResponse.json({ saved: true, anonymous: false, id: item.id });
}
