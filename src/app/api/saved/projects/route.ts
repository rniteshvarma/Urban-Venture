import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getAnonToken, pushAnonActivity } from "@/lib/anon-session";

/**
 * GET — saved projects. Signed in: the user's SavedProject rows (with project
 * details). Anonymous: the ids held in the cookie session. `authenticated`
 * lets the client decide whether to migrate browser-only hearts.
 * `?ids=1` returns just the project ids (used by every heart on a page).
 */
export async function GET(req: Request) {
  const idsOnly = new URL(req.url).searchParams.get("ids") === "1";
  const userId = await getSessionUserId();
  if (!userId) {
    const token = await getAnonToken();
    const anon = token ? await prisma.anonymousSession.findUnique({ where: { token }, select: { savedProjectIds: true } }) : null;
    return NextResponse.json({ authenticated: false, items: [], projectIds: anon?.savedProjectIds ?? [] });
  }
  if (idsOnly) {
    const rows = await prisma.savedProject.findMany({ where: { userId }, select: { projectId: true } });
    return NextResponse.json({ authenticated: true, projectIds: rows.map((r) => r.projectId) });
  }
  const items = await prisma.savedProject.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    include: { project: true },
  });
  return NextResponse.json({ authenticated: true, items, projectIds: items.map((i) => i.projectId) });
}

/** POST { projectId, note? } — save. Authenticated → SavedProject; anonymous → cookie session. */
export async function POST(req: Request) {
  const { projectId, note } = await req.json();
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });

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
