import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

/** GET — saved reports (pinned first, then newest). */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ items: [] });
  const items = await prisma.savedReport.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { savedAt: "desc" }],
    include: { search: { select: { budget: true, horizon: true, city: true, createdAt: true } } },
  });
  return NextResponse.json({ items });
}

/** POST { searchId } — save a search as a report (auto-titled). */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchId } = await req.json();
  if (!searchId) return NextResponse.json({ error: "searchId required" }, { status: 400 });

  const search = await prisma.search.findUnique({ where: { id: searchId } });
  if (!search) return NextResponse.json({ error: "Search not found" }, { status: 404 });

  // ensure the search belongs to this user (claim it if unowned)
  if (search.userId && search.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!search.userId) await prisma.search.update({ where: { id: searchId }, data: { userId } });

  const existing = await prisma.savedReport.findUnique({ where: { searchId } });
  if (existing) return NextResponse.json({ saved: true, id: existing.id });

  const dateStr = search.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const title = `₹${search.budget}L · ${search.horizon}yr · ${search.city} — ${dateStr}`;
  const item = await prisma.savedReport.create({ data: { userId, searchId, title } });
  return NextResponse.json({ saved: true, id: item.id });
}
